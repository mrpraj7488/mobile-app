import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Video-specific battery optimization utilities
 * Optimizes video loading, playback, and memory usage
 */
export class VideoOptimizer {
  private static instance: VideoOptimizer;
  private videoCache: Map<string, any> = new Map();
  private preloadQueue: string[] = [];
  private maxCacheSize = 5; // Maximum videos to keep in memory
  private isLowBandwidth = false;

  private constructor() {
    this.detectBandwidth();
  }

  static getInstance(): VideoOptimizer {
    if (!VideoOptimizer.instance) {
      VideoOptimizer.instance = new VideoOptimizer();
    }
    return VideoOptimizer.instance;
  }

  private async detectBandwidth(): Promise<void> {
    try {
      // Simple bandwidth detection
      const startTime = Date.now();
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      
      // If request takes more than 2 seconds, consider it low bandwidth
      this.isLowBandwidth = (endTime - startTime) > 2000;
      
      if (this.isLowBandwidth) {
        this.maxCacheSize = 2; // Reduce cache size for low bandwidth
      }
    } catch (error) {
      this.isLowBandwidth = true; // Conservative approach
    }
  }

  /**
   * Optimize video loading based on current conditions
   */
  public optimizeVideoLoading(videoId: string, priority: 'high' | 'medium' | 'low' = 'medium'): {
    shouldPreload: boolean;
    quality: 'high' | 'medium' | 'low';
    timeout: number;
  } {
    const appState = AppState.currentState;
    const isBackground = appState === 'background';
    
    // Don't preload in background or low bandwidth
    const shouldPreload = !isBackground && !this.isLowBandwidth && priority === 'high';
    
    // Determine quality based on conditions
    let quality: 'high' | 'medium' | 'low' = 'medium';
    if (this.isLowBandwidth || isBackground) {
      quality = 'low';
    } else if (priority === 'high' && !this.isLowBandwidth) {
      quality = 'high';
    }
    
    // Optimize timeout based on conditions
    let timeout = 15000; // Default 15 seconds
    if (this.isLowBandwidth) {
      timeout = 30000; // 30 seconds for slow connections
    } else if (priority === 'high') {
      timeout = 10000; // 10 seconds for high priority
    }
    
    return { shouldPreload, quality, timeout };
  }

  /**
   * Manage video cache to prevent memory bloat
   */
  public cacheVideo(videoId: string, videoData: any): void {
    // Remove oldest videos if cache is full
    if (this.videoCache.size >= this.maxCacheSize) {
      const oldestKey = this.videoCache.keys().next().value;
      if (oldestKey) {
        this.videoCache.delete(oldestKey);
      }
    }
    
    this.videoCache.set(videoId, {
      data: videoData,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Get cached video data
   */
  public getCachedVideo(videoId: string): any | null {
    const cached = this.videoCache.get(videoId);
    if (cached) {
      // Update access count and timestamp
      cached.accessCount++;
      cached.timestamp = Date.now();
      return cached.data;
    }
    return null;
  }

  /**
   * Clean up expired cache entries
   */
  public cleanupCache(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [videoId, cached] of this.videoCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.videoCache.delete(videoId);
      }
    }
  }

  /**
   * Optimize video preloading queue
   */
  public managePreloadQueue(videoIds: string[]): string[] {
    // Limit preload queue based on conditions
    let maxPreload = 3;
    
    if (this.isLowBandwidth) {
      maxPreload = 1;
    } else if (AppState.currentState === 'background') {
      maxPreload = 0;
    }
    
    return videoIds.slice(0, maxPreload);
  }

  /**
   * Get optimized video player configuration
   */
  public getPlayerConfig(): {
    autoplay: boolean;
    preload: 'none' | 'metadata' | 'auto';
    controls: boolean;
    muted: boolean;
  } {
    const appState = AppState.currentState;
    const isBackground = appState === 'background';
    
    return {
      autoplay: !isBackground && !this.isLowBandwidth,
      preload: this.isLowBandwidth ? 'none' : 'metadata',
      controls: true,
      muted: true // Start muted to save battery
    };
  }

  /**
   * Optimize video quality based on device capabilities
   */
  public getOptimalQuality(): 'high' | 'medium' | 'low' {
    if (this.isLowBandwidth) {
      return 'low';
    }
    
    // Check device memory (simplified)
    const memoryInfo = (global as any).performance?.memory;
    if (memoryInfo) {
      const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
      if (memoryUsage > 0.8) {
        return 'low';
      } else if (memoryUsage > 0.6) {
        return 'medium';
      }
    }
    
    return 'high';
  }

  /**
   * Battery-optimized video loading timeout
   */
  public getLoadingTimeout(priority: 'high' | 'medium' | 'low' = 'medium'): number {
    let baseTimeout = 15000; // 15 seconds
    
    if (this.isLowBandwidth) {
      baseTimeout = 30000; // 30 seconds for slow connections
    }
    
    switch (priority) {
      case 'high':
        return Math.max(baseTimeout * 0.7, 10000); // Minimum 10 seconds
      case 'low':
        return baseTimeout * 1.5;
      default:
        return baseTimeout;
    }
  }

  /**
   * Pause video operations when in background
   */
  public pauseVideoOperations(): void {
    // Clear preload queue
    this.preloadQueue = [];
    
    // Reduce cache size
    while (this.videoCache.size > 1) {
      const oldestKey = this.videoCache.keys().next().value;
      if (oldestKey) {
        this.videoCache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Resume video operations when app becomes active
   */
  public resumeVideoOperations(): void {
    // Restore normal cache size
    this.maxCacheSize = this.isLowBandwidth ? 2 : 5;
    
    // Re-detect bandwidth
    this.detectBandwidth();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    cacheSize: number;
    preloadQueueSize: number;
    estimatedMemoryUsage: number;
  } {
    const avgVideoSize = 2; // MB estimate
    const estimatedMemoryUsage = this.videoCache.size * avgVideoSize;
    
    return {
      cacheSize: this.videoCache.size,
      preloadQueueSize: this.preloadQueue.length,
      estimatedMemoryUsage
    };
  }

  /**
   * Force cleanup for low memory situations
   */
  public forceCleanup(): void {
    this.videoCache.clear();
    this.preloadQueue = [];
    
    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }
  }
}

export default VideoOptimizer;
