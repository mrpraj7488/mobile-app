import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/**
 * Smart caching and storage optimization utilities
 * Manages cache lifecycle, storage cleanup, and memory optimization
 */
export class CacheOptimizer {
  private static instance: CacheOptimizer;
  private cacheMetrics: Map<string, { size: number; lastAccess: number; accessCount: number }> = new Map();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB default
  private currentCacheSize = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.initializeOptimizer();
  }

  static getInstance(): CacheOptimizer {
    if (!CacheOptimizer.instance) {
      CacheOptimizer.instance = new CacheOptimizer();
    }
    return CacheOptimizer.instance;
  }

  private initializeOptimizer(): void {
    this.loadCacheMetrics();
    this.startPeriodicCleanup();
    this.setupAppStateHandlers();
  }

  private async loadCacheMetrics(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem('cache_metrics');
      if (metricsData) {
        const metrics = JSON.parse(metricsData);
        this.cacheMetrics = new Map(Object.entries(metrics));
        this.calculateCurrentCacheSize();
      }
    } catch (error) {
      // Failed to load cache metrics
    }
  }

  private async saveCacheMetrics(): Promise<void> {
    try {
      const metricsObject = Object.fromEntries(this.cacheMetrics);
      await AsyncStorage.setItem('cache_metrics', JSON.stringify(metricsObject));
    } catch (error) {
      // Failed to save cache metrics
    }
  }

  private calculateCurrentCacheSize(): void {
    this.currentCacheSize = Array.from(this.cacheMetrics.values())
      .reduce((total, metric) => total + metric.size, 0);
  }

  private startPeriodicCleanup(): void {
    // Clean up every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 10 * 60 * 1000);
  }

  private setupAppStateHandlers(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        this.onAppBackground();
      } else if (nextAppState === 'active') {
        this.onAppForeground();
      }
    });
  }

  private onAppBackground(): void {
    // Aggressive cleanup when app goes to background
    this.performAggressiveCleanup();
    this.saveCacheMetrics();
  }

  private onAppForeground(): void {
    // Load fresh metrics when app becomes active
    this.loadCacheMetrics();
  }

  /**
   * Store data in cache with automatic size management
   */
  public async setCache(key: string, data: any, ttl?: number): Promise<boolean> {
    try {
      const serializedData = JSON.stringify(data);
      const dataSize = new Blob([serializedData]).size;
      
      // Check if we need to make space
      if (this.currentCacheSize + dataSize > this.maxCacheSize) {
        await this.makeSpace(dataSize);
      }
      
      // Store with TTL if provided
      const cacheEntry = {
        data: serializedData,
        timestamp: Date.now(),
        ttl: ttl || 0,
      };
      
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
      
      // Update metrics
      this.cacheMetrics.set(key, {
        size: dataSize,
        lastAccess: Date.now(),
        accessCount: 1,
      });
      
      this.currentCacheSize += dataSize;
      return true;
    } catch (error) {
      // Failed to cache item
      return false;
    }
  }

  /**
   * Retrieve data from cache
   */
  public async getCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      if (!cachedData) return null;
      
      const cacheEntry = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check TTL expiration
      if (cacheEntry.ttl > 0 && now - cacheEntry.timestamp > cacheEntry.ttl) {
        await this.removeCache(key);
        return null;
      }
      
      // Update access metrics
      const metrics = this.cacheMetrics.get(key);
      if (metrics) {
        metrics.lastAccess = now;
        metrics.accessCount++;
      }
      
      return JSON.parse(cacheEntry.data);
    } catch (error) {
      // Failed to retrieve cache
      return null;
    }
  }

  /**
   * Remove specific cache entry
   */
  public async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
      const metrics = this.cacheMetrics.get(key);
      if (metrics) {
        this.currentCacheSize -= metrics.size;
        this.cacheMetrics.delete(key);
      }
    } catch (error) {
      // Failed to remove cache
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  public async hasValidCache(key: string): Promise<boolean> {
    try {
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      if (!cachedData) return false;
      
      const cacheEntry = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check TTL expiration
      if (cacheEntry.ttl > 0 && now - cacheEntry.timestamp > cacheEntry.ttl) {
        await this.removeCache(key);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make space in cache by removing least recently used items
   */
  private async makeSpace(requiredSize: number): Promise<void> {
    const sortedEntries = Array.from(this.cacheMetrics.entries())
      .sort(([, a], [, b]) => {
        // Sort by access frequency and recency (LRU with frequency consideration)
        const scoreA = a.accessCount / (Date.now() - a.lastAccess);
        const scoreB = b.accessCount / (Date.now() - b.lastAccess);
        return scoreA - scoreB;
      });
    
    let freedSpace = 0;
    for (const [key] of sortedEntries) {
      if (freedSpace >= requiredSize) break;
      
      const metrics = this.cacheMetrics.get(key);
      if (metrics) {
        freedSpace += metrics.size;
        await this.removeCache(key);
      }
    }
  }

  /**
   * Perform regular cleanup of expired entries
   */
  public async performCleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Find expired entries
    for (const [key] of this.cacheMetrics) {
      try {
        const cachedData = await AsyncStorage.getItem(`cache_${key}`);
        if (cachedData) {
          const cacheEntry = JSON.parse(cachedData);
          if (cacheEntry.ttl > 0 && now - cacheEntry.timestamp > cacheEntry.ttl) {
            expiredKeys.push(key);
          }
        } else {
          // Cache entry doesn't exist, remove from metrics
          expiredKeys.push(key);
        }
      } catch (error) {
        // Corrupted entry, remove it
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of expiredKeys) {
      await this.removeCache(key);
    }
    
    // Clean up old temporary files
    await this.cleanupTemporaryStorage();
  }

  /**
   * Aggressive cleanup for low memory situations
   */
  public async performAggressiveCleanup(): Promise<void> {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Remove entries older than 1 hour or accessed less than 3 times
    for (const [key, metrics] of this.cacheMetrics) {
      const age = now - metrics.lastAccess;
      if (age > 60 * 60 * 1000 || metrics.accessCount < 3) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      await this.removeCache(key);
    }
    
    // Reduce cache size limit temporarily
    this.maxCacheSize = Math.max(20 * 1024 * 1024, this.maxCacheSize * 0.7); // Reduce to 70% or 20MB minimum
  }

  /**
   * Clean up temporary storage and logs
   */
  private async cleanupTemporaryStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const tempKeys = allKeys.filter(key => 
        key.startsWith('temp_') || 
        key.startsWith('debug_') ||
        key.startsWith('log_') ||
        key.startsWith('analytics_')
      );
      
      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
      }
    } catch (error) {
      // Failed to cleanup temporary storage
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalSize: number;
    entryCount: number;
    maxSize: number;
    utilizationPercentage: number;
    topEntries: { key: string; size: number; accessCount: number }[];
  } {
    const topEntries = Array.from(this.cacheMetrics.entries())
      .map(([key, metrics]) => ({
        key,
        size: metrics.size,
        accessCount: metrics.accessCount,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
    
    return {
      totalSize: this.currentCacheSize,
      entryCount: this.cacheMetrics.size,
      maxSize: this.maxCacheSize,
      utilizationPercentage: (this.currentCacheSize / this.maxCacheSize) * 100,
      topEntries,
    };
  }

  /**
   * Clear all cache
   */
  public async clearAllCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      this.cacheMetrics.clear();
      this.currentCacheSize = 0;
      await AsyncStorage.removeItem('cache_metrics');
    } catch (error) {
      // Failed to clear all cache
    }
  }

  /**
   * Set maximum cache size
   */
  public setMaxCacheSize(sizeInBytes: number): void {
    this.maxCacheSize = sizeInBytes;
    
    // If current cache exceeds new limit, trigger cleanup
    if (this.currentCacheSize > this.maxCacheSize) {
      this.makeSpace(this.currentCacheSize - this.maxCacheSize);
    }
  }

  /**
   * Preload critical data
   */
  public async preloadCriticalData(dataLoader: () => Promise<Record<string, any>>): Promise<void> {
    try {
      const criticalData = await dataLoader();
      
      for (const [key, value] of Object.entries(criticalData)) {
        await this.setCache(`critical_${key}`, value, 24 * 60 * 60 * 1000); // 24 hour TTL
      }
    } catch (error) {
      // Failed to preload critical data
    }
  }

  /**
   * Cleanup on app shutdown
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.saveCacheMetrics();
  }
}

export default CacheOptimizer;
