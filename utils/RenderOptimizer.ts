import { AppState , InteractionManager } from 'react-native';

/**
 * Rendering and CPU optimization utilities
 * Reduces CPU-intensive operations and improves rendering performance
 */
export class RenderOptimizer {
  private static instance: RenderOptimizer;
  private frameDropThreshold = 16.67; // 60 FPS target
  private lastFrameTime = 0;
  private frameDropCount = 0;
  private isOptimizationEnabled = true;

  private constructor() {
    this.initializeOptimizer();
  }

  static getInstance(): RenderOptimizer {
    if (!RenderOptimizer.instance) {
      RenderOptimizer.instance = new RenderOptimizer();
    }
    return RenderOptimizer.instance;
  }

  private initializeOptimizer(): void {
    // Monitor frame drops
    this.startFrameMonitoring();
  }

  private startFrameMonitoring(): void {
    const monitorFrame = () => {
      const currentTime = performance.now();
      if (this.lastFrameTime > 0) {
        const frameDelta = currentTime - this.lastFrameTime;
        if (frameDelta > this.frameDropThreshold * 2) {
          this.frameDropCount++;
          if (this.frameDropCount > 5) {
            this.enableAggressiveOptimization();
          }
        }
      }
      this.lastFrameTime = currentTime;
      
      if (AppState.currentState === 'active') {
        requestAnimationFrame(monitorFrame);
      }
    };
    
    requestAnimationFrame(monitorFrame);
  }

  private enableAggressiveOptimization(): void {
    this.isOptimizationEnabled = true;
    // Reset counter after enabling optimization
    setTimeout(() => {
      this.frameDropCount = 0;
    }, 5000);
  }

  /**
   * Optimize expensive operations by deferring them
   */
  public deferExpensiveOperation<T>(operation: () => T): Promise<T> {
    return new Promise((resolve) => {
      if (this.isOptimizationEnabled) {
        // Use InteractionManager to defer until after interactions
        InteractionManager.runAfterInteractions(() => {
          resolve(operation());
        });
      } else {
        // Run immediately if optimization is disabled
        resolve(operation());
      }
    });
  }

  /**
   * Batch multiple operations to reduce render cycles
   */
  public batchOperations<T>(operations: (() => T)[]): Promise<T[]> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        const results = operations.map(op => op());
        resolve(results);
      });
    });
  }

  /**
   * Throttle function calls to reduce CPU usage
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func(...args);
          timeoutId = null;
        }, delay - (now - lastCall));
      }
    };
  }

  /**
   * Debounce function calls to prevent excessive execution
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
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
   * Optimize list rendering by implementing virtual scrolling concepts
   */
  public getOptimalRenderWindow(
    totalItems: number,
    viewportHeight: number,
    itemHeight: number,
    scrollOffset: number
  ): { startIndex: number; endIndex: number; totalHeight: number } {
    const visibleItems = Math.ceil(viewportHeight / itemHeight);
    const bufferSize = Math.min(5, Math.floor(visibleItems * 0.5)); // 50% buffer
    
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - bufferSize);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + bufferSize * 2);
    
    return {
      startIndex,
      endIndex,
      totalHeight: totalItems * itemHeight
    };
  }

  /**
   * Optimize image loading and rendering
   */
  public getOptimalImageSize(
    containerWidth: number,
    containerHeight: number,
    devicePixelRatio: number = 1
  ): { width: number; height: number; quality: number } {
    // Adjust for device pixel ratio but cap at 2x for battery optimization
    const effectivePixelRatio = Math.min(devicePixelRatio, 2);
    
    const width = Math.floor(containerWidth * effectivePixelRatio);
    const height = Math.floor(containerHeight * effectivePixelRatio);
    
    // Reduce quality for large images to save memory and battery
    let quality = 0.8;
    if (width * height > 1000000) { // 1MP+
      quality = 0.6;
    } else if (width * height > 500000) { // 500K+
      quality = 0.7;
    }
    
    return { width, height, quality };
  }

  /**
   * Optimize animation performance
   */
  public getOptimalAnimationConfig(animationType: 'spring' | 'timing' | 'decay'): {
    useNativeDriver: boolean;
    duration?: number;
    tension?: number;
    friction?: number;
  } {
    const baseConfig = {
      useNativeDriver: true, // Always use native driver for better performance
    };

    if (this.frameDropCount > 3) {
      // Reduce animation complexity when performance is poor
      switch (animationType) {
        case 'spring':
          return {
            ...baseConfig,
            tension: 100, // Reduced from default
            friction: 8,
          };
        case 'timing':
          return {
            ...baseConfig,
            duration: 200, // Shorter duration
          };
        case 'decay':
          return baseConfig;
      }
    }

    // Normal performance configurations
    switch (animationType) {
      case 'spring':
        return {
          ...baseConfig,
          tension: 150,
          friction: 8,
        };
      case 'timing':
        return {
          ...baseConfig,
          duration: 300,
        };
      case 'decay':
        return baseConfig;
    }
  }

  /**
   * Optimize component re-renders
   */
  public shouldComponentUpdate(
    prevProps: Record<string, any>,
    nextProps: Record<string, any>,
    shallowCompare: boolean = true
  ): boolean {
    if (shallowCompare) {
      const prevKeys = Object.keys(prevProps);
      const nextKeys = Object.keys(nextProps);
      
      if (prevKeys.length !== nextKeys.length) {
        return true;
      }
      
      for (const key of prevKeys) {
        if (prevProps[key] !== nextProps[key]) {
          return true;
        }
      }
      
      return false;
    }
    
    // Deep comparison for complex objects (more expensive)
    return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): {
    frameDropCount: number;
    isOptimizationEnabled: boolean;
    averageFrameTime: number;
  } {
    return {
      frameDropCount: this.frameDropCount,
      isOptimizationEnabled: this.isOptimizationEnabled,
      averageFrameTime: this.lastFrameTime
    };
  }

  /**
   * Force enable/disable optimization
   */
  public setOptimizationEnabled(enabled: boolean): void {
    this.isOptimizationEnabled = enabled;
  }

  /**
   * Reset performance counters
   */
  public resetMetrics(): void {
    this.frameDropCount = 0;
    this.lastFrameTime = 0;
  }
}

export default RenderOptimizer;
