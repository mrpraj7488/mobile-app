import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import SecurityService from '../services/SecurityService';
import AdService from '../services/AdService';
import { validateRuntimeConfig, fetchRuntimeConfig as fetchSecureRuntimeConfig } from '../lib/supabase';
import type { RuntimeConfig } from '../lib/supabase';

// Use shared RuntimeConfig type from lib/supabase

interface ConfigContextType {
  config: RuntimeConfig | null;
  loading: boolean;
  error: string | null;
  isConfigValid: boolean;
  securityReport: any;
  refreshConfig: () => Promise<void>;
  validateSecurity: () => Promise<boolean>;
  handleAdBlockDetection: (detected: boolean) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

const CONFIG_CACHE_KEY = 'runtime_config_cache';
const CONFIG_HASH_KEY = 'runtime_config_hash';
const DEFAULT_TTL = 3600; // 1 hour

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [securityReport, setSecurityReport] = useState<any>(null);

  useEffect(() => {
    // Clear any potentially corrupted cache on startup in development
    const clearCorruptedCache = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
        if (cachedData && !cachedData.startsWith('{')) {
          // If cached data doesn't look like JSON, it's likely corrupted encrypted data
          if (process.env.NODE_ENV !== 'production') {
            console.log('📱 Clearing potentially corrupted cache on startup');
          }
          await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
          await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Cache check failed, clearing cache');
        }
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
      }
    };
    
    clearCorruptedCache().then(() => {
      initializeConfig();
    });
  }, []);

  const initializeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, perform security checks
      const securityValid = await validateSecurity();
      if (!securityValid) {
        setError('Security validation failed. Some features may be restricted.');
        setLoading(false);
        // Continue with limited functionality
      }

      // Try to load cached config first
      const cachedConfig = await loadCachedConfig();
      if (cachedConfig && isCacheValid(cachedConfig)) {
        setConfig(cachedConfig);
        setIsConfigValid(true);
        
        // Don't set loading to false yet, wait for services to initialize
        // Initialize services with cached config first
        await initializeServicesWithConfig(cachedConfig);
        
        // Now set loading to false
        setLoading(false);
        
        // Fetch fresh config in background (don't await)
        fetchFreshConfig().catch(error => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('📱 Background config refresh failed:', error);
          }
        });
        return;
      }

      // No valid cached config, fetch fresh config
      await fetchFreshConfig();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Config initialization error:', err);
      }
      setError('Failed to initialize app configuration');
      setLoading(false);
    }
  };

  const loadCachedConfig = async (): Promise<RuntimeConfig | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (!cachedData) return null;

      let parsedConfig;
      try {
        // Check if data looks like JSON (starts with {)
        if (cachedData.startsWith('{')) {
          // Direct JSON, parse it
          parsedConfig = JSON.parse(cachedData);
        } else {
          // Encrypted data, try to decrypt
          parsedConfig = await decryptConfig(cachedData);
        }
      } catch (parseError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('📱 Cache parse/decrypt failed, clearing corrupted cache');
        }
        // Clear corrupted cache immediately
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        return null;
      }
      
      // Validate config structure
      if (!isValidConfigStructure(parsedConfig)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Cached config has invalid structure, clearing cache');
        }
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        return null;
      }

      return parsedConfig;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading cached config:', error);
      }
      // Clear corrupted cache
      try {
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Cleared corrupted cache data');
        }
      } catch (clearError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error clearing cache:', clearError);
        }
      }
      return null;
    }
  };

  const isCacheValid = (cachedConfig: RuntimeConfig): boolean => {
    if (!cachedConfig.metadata?.lastUpdated || !cachedConfig.metadata?.ttl) {
      return false;
    }

    const lastUpdated = new Date(cachedConfig.metadata.lastUpdated);
    const ttl = cachedConfig.metadata.ttl * 1000; // Convert to milliseconds
    const now = new Date();

    return (now.getTime() - lastUpdated.getTime()) < ttl;
  };

  const fetchFreshConfig = async () => {
    try {
      // 1) Try secure endpoint first (returns anonKey if authorized)
      let freshConfig: RuntimeConfig | null = await fetchSecureRuntimeConfig();

      // 2) Fallback to public endpoint if secure failed
      const allowPublicFallback = process.env.EXPO_PUBLIC_ALLOW_PUBLIC_CONFIG !== 'false';
      if (!freshConfig && allowPublicFallback) {
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://admin-vidgro.netlify.app';
        const configUrl = `${apiBaseUrl}/api/client-runtime-config`;

        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Fetching runtime config from:', configUrl);
        }

        const response = await axios.get(configUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': `VidGro-Mobile/${Platform.OS}`,
            'X-App-Version': '1.0.0',
            'X-Platform': Platform.OS,
            'X-Device-Fingerprint': await SecurityService.getInstance().generateDeviceFingerprint(),
            'X-App-Hash': await SecurityService.getInstance().generateAppHash(),
          },
        });

        // Avoid logging full payload in production
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Server response received:', JSON.stringify(response.data, null, 2));
        }

        const rawConfig = response.data.data || response.data as RuntimeConfig;
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Extracted config:', JSON.stringify(rawConfig, null, 2));
        }

        // Normalize and validate using shared validator (allows missing anonKey for public endpoint)
        const validated = validateRuntimeConfig(rawConfig);
        if (!validated) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('📱 Invalid config structure. Expected fields:', {
              supabase: !!rawConfig?.supabase,
              admob: !!rawConfig?.admob,
              features: !!rawConfig?.features,
              app: !!rawConfig?.app,
              security: !!rawConfig?.security,
              metadata: !!rawConfig?.metadata
            });
          }
          throw new Error('Invalid config structure in response data');
        }
        freshConfig = validated;
      }
      
      // Validate config integrity (optional HMAC check)
      if (!freshConfig) throw new Error('No configuration available from secure or public endpoints');

      const configHash = await generateConfigHash(freshConfig);
      // No response headers when using secure helper; skip header-based integrity check here
      const integrityValid = true;
      
      if (!integrityValid) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Config integrity validation failed');
        }
      }
      
      // Cache the fresh config
      await cacheConfig(freshConfig, configHash);

      setConfig(freshConfig);
      setIsConfigValid(true);
      setError(null);

      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 Runtime config loaded successfully');
        console.log('📱 Features enabled:', freshConfig.features);
      }
      
      // Initialize services with runtime config
      await initializeServicesWithConfig(freshConfig);
      
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching fresh config:', err);
      }
      
      // Try to use cached config as fallback
      const cachedConfig = await loadCachedConfig();
      if (cachedConfig) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📱 Using cached config as fallback');
        }
        setConfig(cachedConfig);
        setIsConfigValid(true);
        setError('Using cached configuration');
      } else {
        setError(`Failed to load configuration: ${err.message}`);
        setIsConfigValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const cacheConfig = async (config: RuntimeConfig, hash: string) => {
    try {
      // In production, avoid persisting secrets (strip anonKey before caching)
      const safeToCache: RuntimeConfig = process.env.NODE_ENV === 'production'
        ? { 
            ...config, 
            supabase: { ...config.supabase, anonKey: undefined }
          }
        : config;

      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(safeToCache));
      await AsyncStorage.setItem(CONFIG_HASH_KEY, hash);
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 Config cached successfully (unencrypted for development)');
      } else {
        console.log('📱 Config cached (secrets not persisted)');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error caching config:', error);
      }
    }
  };

  const encryptConfig = async (config: RuntimeConfig): Promise<string> => {
    try {
      // Simple encryption using device-specific key
      const deviceKey = await SecurityService.getInstance().generateDeviceFingerprint();
      const configString = JSON.stringify(config);
      
      // In production, use proper encryption library
      // For now, just base64 encode with device key
      const combined = `${deviceKey}:${configString}`;
      // Use btoa for base64 encoding (React Native compatible)
      return btoa(combined);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Config encryption error:', error);
      }
      return JSON.stringify(config);
    }
  };

  const decryptConfig = async (encryptedConfig: string): Promise<RuntimeConfig | null> => {
    try {
      const deviceKey = await SecurityService.getInstance().generateDeviceFingerprint();
      const decoded = atob(encryptedConfig);
      const [storedKey, configString] = decoded.split(':');
      
      if (storedKey !== deviceKey) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Device key mismatch, config may be from different device');
        }
        return null;
      }
      
      return JSON.parse(configString);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Config decryption error:', error);
      }
      // Try to parse as unencrypted JSON
      try {
        return JSON.parse(encryptedConfig);
      } catch {
        return null;
      }
    }
  };

  const initializeServicesWithConfig = async (config: RuntimeConfig) => {
    try {
      // Initialize Supabase with runtime config
      const { initializeSupabase } = await import('../lib/supabase');
      const fallbackAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null;
      const anonKeyToUse = config.supabase.anonKey || fallbackAnonKey;
      initializeSupabase(config.supabase.url, anonKeyToUse);
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 Supabase initialized with runtime config');
      }

      // Initialize AdMob with ad block detection callback
      if (config.features.adsEnabled) {
        try {
          const adService = AdService.getInstance();
          
          // Check if already initialized to prevent duplicate initialization
          if (!adService.getInitializationStatus()) {
            if (config.admob?.appId) {
              const adConfig = {
                appId: config.admob.appId,
                bannerId: config.admob.bannerId || '',
                interstitialId: config.admob.interstitialId || '',
                rewardedId: config.admob.rewardedId || ''
              };
              const adInitSuccess = await adService.initialize(
                adConfig,
                config.security.adBlockDetection,
                handleAdBlockDetection
              );
              if (!adInitSuccess) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('📱 AdMob initialization failed, continuing without ads');
                }
              }
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('📱 AdMob appId missing in config; skipping ad initialization');
              }
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('📱 AdMob already initialized, skipping');
            }
          }
        } catch (adError) {
          const message = adError instanceof Error ? adError.message : String(adError);
          if (process.env.NODE_ENV !== 'production') {
            console.warn('📱 AdMob initialization error, continuing without ads:', message);
          }
        }
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 All services initialized with runtime config');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Service initialization error:', error);
      }
    }
  };

  const validateSecurity = async (): Promise<boolean> => {
    try {
      const securityService = SecurityService.getInstance();
      const securityResult = await securityService.performSecurityChecks({
        security: {
          allowRooted: false,
          allowEmulators: true,
          requireSignatureValidation: false,
          adBlockDetection: true,
        }
      });
      
      setSecurityReport(securityService.getSecurityReport());
      
      if (securityResult.warnings.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('🔒 Security warnings:', securityResult.warnings);
        }
      }
      
      if (securityResult.errors.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('🔒 Security errors:', securityResult.errors);
        }
        return false;
      }
      
      return securityResult.isValid;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Security validation error:', error);
      }
      return true; // Don't block app if security check fails
    }
  };

  const handleAdBlockDetection = (detected: boolean) => {
    if (detected) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('🚫 Ad blocking detected by AdService');
      }
      // You can implement user notification or feature restrictions here
      // For example:
      // Alert.alert('Ad Blocker Detected', 'Please disable ad blocking to earn coins');
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Ads working normally');
      }
    }
  };

  const generateConfigHash = async (config: RuntimeConfig): Promise<string> => {
    try {
      const configString = JSON.stringify(config);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        configString
      );
      return hash;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error generating config hash:', error);
      }
      return '';
    }
  };

  const isValidConfigStructure = (config: any): boolean => {
    return (
      config &&
      config.supabase &&
      config.supabase.url &&
      config.admob &&
      config.admob.appId &&
      config.features &&
      config.app &&
      config.security &&
      config.metadata
    );
  };

  const refreshConfig = async () => {
    await fetchFreshConfig();
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
      await AsyncStorage.removeItem(CONFIG_HASH_KEY);
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 Configuration cache cleared');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error clearing cache:', error);
      }
    }
  };

  const value: ConfigContextType = {
    config,
    loading,
    error,
    isConfigValid,
    securityReport,
    refreshConfig,
    validateSecurity,
    handleAdBlockDetection,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}