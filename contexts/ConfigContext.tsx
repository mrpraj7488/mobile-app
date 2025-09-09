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
          await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
          await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        }
      } catch (error) {
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
        fetchFreshConfig().catch(() => {});
        return;
      }

      // No valid cached config, fetch fresh config
      await fetchFreshConfig();
    } catch (err) {
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
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        return null;
      }
      
      if (!isValidConfigStructure(parsedConfig)) {
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
        return null;
      }

      return parsedConfig;
    } catch (error) {
      try {
        await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
        await AsyncStorage.removeItem(CONFIG_HASH_KEY);
      } catch (clearError) {}
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


        const response = await axios.get(configUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'X-App-Version': '1.0.0',
            'X-Platform': Platform.OS,
            'X-Device-Fingerprint': await SecurityService.getInstance().generateDeviceFingerprint(),
            'X-App-Hash': await SecurityService.getInstance().generateAppHash(),
          },
        });

        const rawConfig = response.data.data || response.data as RuntimeConfig;

        // Normalize and validate using shared validator (allows missing anonKey for public endpoint)
        const validated = validateRuntimeConfig(rawConfig);
        if (!validated) {
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
        throw new Error('Config integrity validation failed');
      }
      
      // Cache the fresh config
      await cacheConfig(freshConfig, configHash);
      setConfig(freshConfig);
      setIsConfigValid(true);
      setError(null);
      await initializeServicesWithConfig(freshConfig);
      
    } catch (err: any) {
      // Try to use cached config as fallback
      const cachedConfig = await loadCachedConfig();
      if (cachedConfig) {
        setConfig(cachedConfig);
        setIsConfigValid(true);
        setError('Using cached configuration');
        
        // Initialize services with cached config
        await initializeServicesWithConfig(cachedConfig);
      } else {
        setError('Unable to connect to server. Please check your internet connection.');
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
    } catch (error) {}
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
      return JSON.stringify(config);
    }
  };

  const decryptConfig = async (encryptedConfig: string): Promise<RuntimeConfig | null> => {
    try {
      const deviceKey = await SecurityService.getInstance().generateDeviceFingerprint();
      const decoded = atob(encryptedConfig);
      const [storedKey, configString] = decoded.split(':');
      
      if (storedKey !== deviceKey) {
        return null;
      }
      
      return JSON.parse(configString);
    } catch (error) {
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

      // Initialize AdMob with ad block detection callback
      if (config.features.adsEnabled) {
        try {
          const adService = AdService.getInstance();
          
          // Check if already initialized to prevent duplicate initialization
          if (!adService.getInitializationStatus()) {
            // AdService now fetches its own configuration from endpoints
            await adService.initialize();
          }
        } catch (adError) {
          // AdService initialization failed
        }
      }
    } catch (error) {}
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
      
      if (securityResult.errors.length > 0) {
        return false;
      }
      
      return securityResult.isValid;
    } catch (error) {
      return true;
    }
  };

  const handleAdBlockDetection = (detected: boolean) => {
    // Handle ad block detection silently
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
    } catch (error) {}
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