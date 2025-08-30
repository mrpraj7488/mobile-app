import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheOptimizer from './CacheOptimizer';
import VideoOptimizer from './VideoOptimizer';
import BatteryOptimizer from './BatteryOptimizer';

/**
 * Comprehensive performance optimization for handling 100K+ concurrent users
 * Manages memory, network requests, and resource allocation
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private rateLimiter: Map<string, number> = new Map();
  private memoryThreshold = 0.8; // 80% memory usage threshold
  
  // Optimized settings for production
  private readonly config = {
    maxConcurrentRequests: 3,
    requestTimeout: 15000,
    retryAttempts: 2,
    rateLimitWindow: 1000, // 1 second
    maxRequestsPerWindow: 10,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    debounceDelay: 300,
    throttleDelay: 1000,
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private initialize(): void {
    // Setup app state monitoring
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Initialize subsystems
    CacheOptimizer.getInstance();
    VideoOptimizer.getInstance();
    BatteryOptimizer.getInstance();
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'background') {
      this.optimizeForBackground();
    } else if (nextAppState === 'active') {
      this.optimizeForForeground();
    }
  };

  private optimizeForBackground(): void {
    // Clear non-essential caches
    CacheOptimizer.getInstance().performAggressiveCleanup();
    
    // Pause video operations
    VideoOptimizer.getInstance().pauseVideoOperations();
    
    // Clear request queue
    this.requestQueue.clear();
  }

  private optimizeForForeground(): void {
    // Resume video operations
    VideoOptimizer.getInstance().resumeVideoOperations();
    
    // Preload critical data
    this.preloadEssentialData();
  }

  /**
   * Optimized network request with caching and rate limiting
   */
  public async makeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      priority?: 'high' | 'medium' | 'low';
      retry?: boolean;
    } = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = this.config.cacheExpiry,
      priority = 'medium',
      retry = true,
    } = options;

    // Check rate limiting
    if (!this.checkRateLimit(key)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Check cache first
    if (cache) {
      const cached = await CacheOptimizer.getInstance().getCache<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if request is already in progress
    const existingRequest = this.requestQueue.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Create new request with timeout and retry logic
    const request = this.executeRequest(requestFn, retry ? this.config.retryAttempts : 1);
    this.requestQueue.set(key, request);

    try {
      const result = await request;
      
      // Cache successful result
      if (cache && result !== null && result !== undefined) {
        await CacheOptimizer.getInstance().setCache(key, result, cacheTTL);
      }
      
      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    retryAttempts: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Add timeout to request
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout);
        });
        
        const result = await Promise.race([requestFn(), timeoutPromise]);
        return result;
      } catch (error) {
        if (attempt === retryAttempts) {
          throw error;
        }
        
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error('Request failed after all retry attempts');
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(key) || 0;
    
    if (now - lastRequest < this.config.rateLimitWindow / this.config.maxRequestsPerWindow) {
      return false;
    }
    
    this.rateLimiter.set(key, now);
    
    // Clean old entries
    if (this.rateLimiter.size > 100) {
      const cutoff = now - this.config.rateLimitWindow;
      for (const [k, timestamp] of this.rateLimiter.entries()) {
        if (timestamp < cutoff) {
          this.rateLimiter.delete(k);
        }
      }
    }
    
    return true;
  }

  /**
   * Debounce function for optimizing frequent operations
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number = this.config.debounceDelay
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func(...args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * Throttle function for limiting execution frequency
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number = this.config.throttleDelay
  ): (...args: Parameters<T>) => void {
    let lastExecution = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecution;
      
      if (timeSinceLastExecution >= delay) {
        func(...args);
        lastExecution = now;
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecution = Date.now();
          timeoutId = null;
        }, delay - timeSinceLastExecution);
      }
    };
  }

  /**
   * Monitor memory usage and trigger cleanup when needed
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryInfo = (global as any).performance?.memory;
      if (memoryInfo) {
        const usage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
        
        if (usage > this.memoryThreshold) {
          this.performMemoryCleanup();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private performMemoryCleanup(): void {
    // Clear caches
    CacheOptimizer.getInstance().performAggressiveCleanup();
    
    // Force video cleanup
    VideoOptimizer.getInstance().forceCleanup();
    
    // Clear request queue
    this.requestQueue.clear();
    this.rateLimiter.clear();
    
    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }
  }

  /**
   * Preload essential data for better UX
   */
  private async preloadEssentialData(): Promise<void> {
    try {
      // Preload user preferences
      const preferences = await AsyncStorage.getItem('user_preferences');
      if (preferences) {
        await CacheOptimizer.getInstance().setCache('preferences', JSON.parse(preferences));
      }
      
      // Preload configuration
      const config = await AsyncStorage.getItem('app_config');
      if (config) {
        await CacheOptimizer.getInstance().setCache('config', JSON.parse(config));
      }
    } catch (error) {
      // Preloading failed, app will fetch on demand
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    activeRequests: number;
    cacheStats: any;
    memoryUsage: number;
    videoStats: any;
  } {
    const memoryInfo = (global as any).performance?.memory;
    const memoryUsage = memoryInfo 
      ? memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize 
      : 0;
    
    return {
      activeRequests: this.requestQueue.size,
      cacheStats: CacheOptimizer.getInstance().getCacheStats(),
      memoryUsage,
      videoStats: VideoOptimizer.getInstance().getMemoryStats(),
    };
  }

  /**
   * Batch operations for better performance
   */
  public async batchOperations<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    const batchSize = this.config.maxConcurrentRequests;
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Optimize image loading
   */
  public getOptimizedImageUrl(url: string, width?: number, height?: number): string {
    // Add image optimization parameters
    const params = new URLSearchParams();
    
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('q', '80'); // 80% quality
    params.append('fm', 'webp'); // Use WebP format
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.requestQueue.clear();
    this.rateLimiter.clear();
    CacheOptimizer.getInstance().cleanup();
  }
}

export default PerformanceOptimizer;
