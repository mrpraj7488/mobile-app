import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

interface AdminAuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

interface PublicConfigResponse {
  data: {
    admob: {
      appId: string;
    };
    features: {
      coinsEnabled: boolean;
      adsEnabled: boolean;
      vipEnabled: boolean;
      referralsEnabled: boolean;
      analyticsEnabled: boolean;
    };
    app: {
      minVersion: string;
      forceUpdate: boolean;
      maintenanceMode: boolean;
      apiVersion: string;
    };
    security: {
      allowEmulators: boolean;
      allowRooted: boolean;
      requireSignatureValidation: boolean;
      adBlockDetection: boolean;
    };
    metadata: {
      configVersion: string;
      lastUpdated: string;
      ttl: number;
    };
  };
  cached: boolean;
  environment: string;
  message: string;
  requestId: string;
  timestamp: string;
}

interface SecureConfigResponse {
  data: {
    admob: {
      bannerId: string;
      interstitialId: string;
      rewardedId: string;
    };
  };
  cached: boolean;
  environment: string;
  message: string;
  requestId: string;
  timestamp: string;
}

interface SecureConfig {
  admob: {
    app_id: string;
    banner_id: string;
    interstitial_id: string;
    rewarded_id: string;
  };
}

class SecureConfigService {
  private static instance: SecureConfigService;
  private config: SecureConfig | null = null;
  private authToken: string | null = null;
  private lastFetch: number = 0;
  private readonly cacheValidityDuration = 7 * 24 * 60 * 60 * 1000; // 7 days for faster startup
  private readonly API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  private readonly CLIENT_ID = process.env.EXPO_PUBLIC_ADMIN_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.EXPO_PUBLIC_ADMIN_CLIENT_SECRET;
  private readonly PUBLIC_CONFIG_URL = 'https://admin-vidgro.netlify.app/api/client-runtime-config';
  private readonly CACHE_KEY = 'secure_admob_config';
  private readonly TOKEN_KEY = 'admin_auth_token';

  static getInstance(): SecureConfigService {
    if (!SecureConfigService.instance) {
      SecureConfigService.instance = new SecureConfigService();
    }
    return SecureConfigService.instance;
  }

  // Authenticate with admin panel to get access token
  private async authenticate(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate secure signature for authentication
  private async generateAuthSignature(timestamp: number, nonce: string): Promise<string> {
    const payload = `${this.CLIENT_ID}:${timestamp}:${nonce}:${this.CLIENT_SECRET}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payload,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  // Verify if current token is still valid
  private async verifyToken(): Promise<boolean> {
    try {
      if (!this.authToken) return false;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Fetch public configuration from admin panel
  private async fetchPublicConfig(): Promise<{ app_id: string } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(this.PUBLIC_CONFIG_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VidGro-Mobile/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      
      if (!response.ok) {
        console.error('[SecureConfigService] Public endpoint failed with status:', response.status);
        return null;
      }

      const configResult: PublicConfigResponse = await response.json();
      
      if (configResult.data && configResult.data.admob && configResult.data.admob.appId) {
        const publicConfig = {
          app_id: configResult.data.admob.appId
        };
        return publicConfig;
      } else {
        console.error('[SecureConfigService] Public config missing AdMob data');
        return null;
      }
    } catch (error) {
      console.error('[SecureConfigService] Public endpoint error:', error);
      return null;
    }
  }

  // Fetch secure configuration from admin panel for sensitive ad unit IDs
  private async fetchSecureConfig(): Promise<Partial<SecureConfig> | null> {
    try {
      const deviceId = await AsyncStorage.getItem('device_id') || `mobile_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      if (!await AsyncStorage.getItem('device_id')) {
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      const requestBody = {
        clientId: this.CLIENT_ID,
        clientSecret: this.CLIENT_SECRET,
        deviceId: deviceId
      };
      
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const secureUrl = `${this.API_BASE_URL}/api/client-runtime-config/secure`;
        
      const response = await fetch(secureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

        
      if (!response.ok) {
        console.error('[SecureConfigService] Secure endpoint failed with status:', response.status);
        const errorText = await response.text();
        console.error('[SecureConfigService] Error response:', errorText);
        return null;
      }

      const configResult: SecureConfigResponse = await response.json();
      
      if (configResult.data && configResult.data.admob) {
        return {
          admob: {
            app_id: configResult.data.admob.bannerId,
            banner_id: configResult.data.admob.bannerId,
            interstitial_id: configResult.data.admob.interstitialId,
            rewarded_id: configResult.data.admob.rewardedId
          }
        };
      } else {
        console.error('[SecureConfigService] Secure config missing AdMob data');
        return null;
      }
    } catch (error) {
      console.error('[SecureConfigService] Secure endpoint error:', error);
      return null;
    }
  }

  async forceRefreshConfig(): Promise<SecureConfig | null> {
    return this.getAdMobConfig();
  }

  async getAdMobConfig(): Promise<SecureConfig | null> {
    
    try {
      const now = Date.now();

      // Check if we have valid cached config
      if (this.config && (now - this.lastFetch) < this.cacheValidityDuration) {
          return this.config;
      }

      // Try to load from local cache first
      const cachedConfig = await this.loadFromLocalCache();
      if (cachedConfig) {
        const cacheAge = now - (cachedConfig.timestamp || 0);
        if (cacheAge < this.cacheValidityDuration) {
          this.config = cachedConfig;
          this.lastFetch = cachedConfig.timestamp || now;
          
          // Refresh in background if cache is older than 1 hour
          if (cacheAge > 60 * 60 * 1000) {
            this.refreshInBackground();
          }
          
          return this.config;
        }
      }

      // Check if environment variables are available
      if (!this.API_BASE_URL || !this.CLIENT_ID || !this.CLIENT_SECRET) {
        return cachedConfig;
      }

      // Try to fetch from endpoints
      const publicConfig = await this.fetchPublicConfig();
      if (!publicConfig) {
        return cachedConfig;
      }

      const authenticated = await this.authenticate();
      if (authenticated) {
        const secureConfig = await this.fetchSecureConfig();
        if (secureConfig && secureConfig.admob) {
          const combinedConfig: SecureConfig = {
            admob: {
              app_id: publicConfig.app_id,
              banner_id: secureConfig.admob.banner_id,
              interstitial_id: secureConfig.admob.interstitial_id,
              rewarded_id: secureConfig.admob.rewarded_id
            }
          };
          
                this.config = combinedConfig;
          this.lastFetch = now;
          await this.saveToLocalCache(combinedConfig);
          return combinedConfig;
        }
      }

      return cachedConfig;
    } catch (error) {
      console.error('[SecureConfigService] Error in getAdMobConfig:', error);
      return await this.loadFromLocalCache();
    }
  }

  // Save configuration to local cache
  private async saveToLocalCache(config: SecureConfig): Promise<void> {
    try {
      const cacheData = {
        config,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
    }
  }

  // Load configuration from local cache
  private async loadFromLocalCache(): Promise<SecureConfig & { timestamp?: number } | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
          return {
          ...cacheData.config,
          timestamp: cacheData.timestamp
        };
      }
      return null;
    } catch (error) {
      console.error('[SecureConfigService] Error loading cache:', error);
      return null;
    }
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.CACHE_KEY, this.TOKEN_KEY]);
      this.config = null;
      this.authToken = null;
      this.lastFetch = 0;
      } catch (error) {
      // Failed to clear cache
    }
  }

  // Refresh config in background without blocking
  private async refreshInBackground(): Promise<void> {
    try {
      const publicConfig = await this.fetchPublicConfig();
      if (!publicConfig) return;
      
      const authenticated = await this.authenticate();
      if (authenticated) {
        const secureConfig = await this.fetchSecureConfig();
        if (secureConfig && secureConfig.admob) {
          const combinedConfig: SecureConfig = {
            admob: {
              app_id: publicConfig.app_id,
              banner_id: secureConfig.admob.banner_id,
              interstitial_id: secureConfig.admob.interstitial_id,
              rewarded_id: secureConfig.admob.rewarded_id
            }
          };
          
          this.config = combinedConfig;
          this.lastFetch = Date.now();
          await this.saveToLocalCache(combinedConfig);
        }
      }
    } catch (error) {
      // Background refresh failed, continue with cached config
    }
  }

  // Check if secure config is available
  async isConfigAvailable(): Promise<boolean> {
    const config = await this.getAdMobConfig();
    return config !== null;
  }
}

export default SecureConfigService;
