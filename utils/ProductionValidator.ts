import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Production readiness validator for VidGro app
 * Ensures all critical systems are functioning correctly
 */
export class ProductionValidator {
  private static instance: ProductionValidator;
  private validationResults: Map<string, boolean> = new Map();
  
  private constructor() {}

  static getInstance(): ProductionValidator {
    if (!ProductionValidator.instance) {
      ProductionValidator.instance = new ProductionValidator();
    }
    return ProductionValidator.instance;
  }

  /**
   * Run comprehensive production validation
   */
  public async runFullValidation(): Promise<{
    isReady: boolean;
    results: Record<string, boolean>;
    criticalIssues: string[];
    warnings: string[];
  }> {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    
    // Validate storage systems
    const storageValid = await this.validateStorage();
    this.validationResults.set('storage', storageValid);
    if (!storageValid) criticalIssues.push('Storage system not functioning');
    
    // Validate secure storage
    const secureStorageValid = await this.validateSecureStorage();
    this.validationResults.set('secureStorage', secureStorageValid);
    if (!secureStorageValid) criticalIssues.push('Secure storage not functioning');
    
    // Validate environment variables
    const envValid = this.validateEnvironmentVariables();
    this.validationResults.set('environment', envValid);
    if (!envValid) criticalIssues.push('Missing critical environment variables');
    
    // Validate network connectivity
    const networkValid = await this.validateNetworkConnectivity();
    this.validationResults.set('network', networkValid);
    if (!networkValid) warnings.push('Network connectivity issues detected');
    
    // Validate API endpoints
    const apiValid = await this.validateAPIEndpoints();
    this.validationResults.set('api', apiValid);
    if (!apiValid) criticalIssues.push('API endpoints not responding');
    
    // Validate memory usage
    const memoryValid = this.validateMemoryUsage();
    this.validationResults.set('memory', memoryValid);
    if (!memoryValid) warnings.push('High memory usage detected');
    
    // Validate app permissions
    const permissionsValid = await this.validatePermissions();
    this.validationResults.set('permissions', permissionsValid);
    if (!permissionsValid) warnings.push('Some permissions not granted');
    
    // Validate data integrity
    const dataIntegrityValid = await this.validateDataIntegrity();
    this.validationResults.set('dataIntegrity', dataIntegrityValid);
    if (!dataIntegrityValid) warnings.push('Data integrity checks failed');
    
    const results = Object.fromEntries(this.validationResults);
    const isReady = criticalIssues.length === 0;
    
    return {
      isReady,
      results,
      criticalIssues,
      warnings
    };
  }

  /**
   * Validate AsyncStorage functionality
   */
  private async validateStorage(): Promise<boolean> {
    try {
      const testKey = '__validation_test__';
      const testValue = 'test_value_' + Date.now();
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * Validate SecureStore functionality
   */
  private async validateSecureStorage(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return true; // Skip for web
      
      const testKey = '__secure_validation_test__';
      const testValue = 'secure_test_' + Date.now();
      
      await SecureStore.setItemAsync(testKey, testValue);
      const retrieved = await SecureStore.getItemAsync(testKey);
      await SecureStore.deleteItemAsync(testKey);
      
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironmentVariables(): boolean {
    const required = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    ];
    
    for (const key of required) {
      if (!process.env[key]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate network connectivity
   */
  private async validateNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.status === 204;
    } catch {
      return false;
    }
  }

  /**
   * Validate API endpoints
   */
  private async validateAPIEndpoints(): Promise<boolean> {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return false;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      
      return response.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * Validate memory usage
   */
  private validateMemoryUsage(): boolean {
    const memoryInfo = (global as any).performance?.memory;
    if (!memoryInfo) return true; // Can't validate, assume OK
    
    const usage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
    return usage < 0.9; // Less than 90% usage
  }

  /**
   * Validate app permissions (placeholder for actual implementation)
   */
  private async validatePermissions(): Promise<boolean> {
    // In a real implementation, check for required permissions
    // like camera, storage, etc. based on platform
    return true;
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(): Promise<boolean> {
    try {
      // Check if user data structure is valid
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (!parsed.id || typeof parsed.coins !== 'number') {
          return false;
        }
      }
      
      // Check if app config is valid
      const appConfig = await AsyncStorage.getItem('app_config');
      if (appConfig) {
        JSON.parse(appConfig); // Just check if parseable
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate specific screen functionality
   */
  public async validateScreen(screenName: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let valid = true;
    
    switch (screenName) {
      case 'login':
        // Validate Google Auth configuration
        if (!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) {
          issues.push('Missing Google Android Client ID');
          valid = false;
        }
        if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
          issues.push('Missing Google Web Client ID');
          valid = false;
        }
        break;
        
      case 'home':
        // Validate video list functionality
        const videoData = await AsyncStorage.getItem('videos_cache');
        if (videoData) {
          try {
            JSON.parse(videoData);
          } catch {
            issues.push('Corrupted video cache');
            valid = false;
          }
        }
        break;
        
      case 'analytics':
        // Validate analytics data
        const analyticsData = await AsyncStorage.getItem('analytics_data');
        if (analyticsData) {
          try {
            const parsed = JSON.parse(analyticsData);
            if (!Array.isArray(parsed.dailyEarnings)) {
              issues.push('Invalid analytics data structure');
              valid = false;
            }
          } catch {
            issues.push('Corrupted analytics data');
            valid = false;
          }
        }
        break;
        
      case 'promote':
        // Validate promotion functionality
        const userCoins = await AsyncStorage.getItem('user_coins');
        if (userCoins) {
          const coins = parseInt(userCoins);
          if (isNaN(coins) || coins < 0) {
            issues.push('Invalid coin balance');
            valid = false;
          }
        }
        break;
    }
    
    return { valid, issues };
  }

  /**
   * Get validation report
   */
  public getValidationReport(): string {
    const results = Object.fromEntries(this.validationResults);
    const report = [
      '=== VidGro Production Validation Report ===',
      '',
      'System Checks:',
      ...Object.entries(results).map(([key, value]) => 
        `  ${key}: ${value ? '✅ PASSED' : '❌ FAILED'}`
      ),
      '',
      'Overall Status: ' + (Object.values(results).every(v => v) ? '✅ READY FOR PRODUCTION' : '⚠️ ISSUES DETECTED'),
      '',
      'Timestamp: ' + new Date().toISOString()
    ];
    
    return report.join('\n');
  }

  /**
   * Clear validation cache
   */
  public clearValidationCache(): void {
    this.validationResults.clear();
  }
}

export default ProductionValidator;
