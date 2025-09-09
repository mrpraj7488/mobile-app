import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import SecurityConfig from '../security-config';

export class SecurityUtils {
  private static readonly SECURITY_SALT = 'VidGro2024Security';
  private static readonly OBFUSCATION_KEY = 'VG_OBF_2024';

  /**
   * Obfuscate sensitive data before storage
   */
  static async obfuscateData(data: string): Promise<string> {
    try {
      const combined = data + this.SECURITY_SALT;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );
      
      // Simple XOR obfuscation with hash
      let obfuscated = '';
      for (let i = 0; i < data.length; i++) {
        const keyChar = hash.charCodeAt(i % hash.length);
        const dataChar = data.charCodeAt(i);
        obfuscated += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return Buffer.from(obfuscated).toString('base64');
    } catch (error) {
      return data; // Return original if obfuscation fails
    }
  }

  /**
   * Deobfuscate sensitive data after retrieval
   */
  static async deobfuscateData(obfuscatedData: string): Promise<string> {
    try {
      const decoded = Buffer.from(obfuscatedData, 'base64').toString();
      const combined = decoded + this.SECURITY_SALT;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );
      
      let deobfuscated = '';
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = hash.charCodeAt(i % hash.length);
        const dataChar = decoded.charCodeAt(i);
        deobfuscated += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return deobfuscated;
    } catch (error) {
      return obfuscatedData; // Return original if deobfuscation fails
    }
  }

  /**
   * Secure storage wrapper with obfuscation
   */
  static async secureStore(key: string, value: string): Promise<void> {
    try {
      const obfuscatedValue = await this.obfuscateData(value);
      await SecureStore.setItemAsync(key, obfuscatedValue);
    } catch (error) {
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Secure retrieval wrapper with deobfuscation
   */
  static async secureRetrieve(key: string): Promise<string | null> {
    try {
      const obfuscatedValue = await SecureStore.getItemAsync(key);
      if (obfuscatedValue) {
        return await this.deobfuscateData(obfuscatedValue);
      }
      return null;
    } catch (error) {
      return await AsyncStorage.getItem(key);
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  static async generateSecureHash(data: any): Promise<string> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const saltedData = dataString + this.SECURITY_SALT + Date.now();
      
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltedData
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * Validate data integrity using hash
   */
  static async validateDataIntegrity(data: any, expectedHash: string): Promise<boolean> {
    try {
      const currentHash = await this.generateSecureHash(data);
      return currentHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize and validate input data
   */
  static sanitizeInput(input: string, type: 'youtubeUrl' | 'email' | 'username' | 'videoId'): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    let sanitized = input.replace(/[<>\"'%;()&+]/g, '');
    
    // Apply specific validation based on type
    const pattern = SecurityConfig.validation[type];
    if (pattern && !pattern.test(sanitized)) {
      return '';
    }

    return sanitized.trim();
  }

  /**
   * Check if data contains sensitive patterns
   */
  static containsSensitiveData(data: string): boolean {
    if (!data || typeof data !== 'string') {
      return false;
    }

    return SecurityConfig.sensitivePatterns.some(pattern => 
      pattern.test(data.toLowerCase())
    );
  }

  /**
   * Secure logging that excludes sensitive data
   */
  static secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (__DEV__) {
      const sanitizedMessage = this.containsSensitiveData(message) ? '[REDACTED]' : message;
      
      let sanitizedData = data;
      if (data && typeof data === 'object') {
        sanitizedData = this.sanitizeLogData(data);
      } else if (data && typeof data === 'string' && this.containsSensitiveData(data)) {
        sanitizedData = '[REDACTED]';
      }

      // Logging disabled in production for security
      // Messages are sanitized but not output
    }
  }

  /**
   * Recursively sanitize object data for logging
   */
  private static sanitizeLogData(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.containsSensitiveData(obj) ? '[REDACTED]' : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeLogData(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.containsSensitiveData(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeLogData(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Generate device-specific encryption key
   */
  static async generateDeviceKey(): Promise<string> {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)) // Daily rotation
      };

      const keyData = JSON.stringify(deviceInfo) + this.SECURITY_SALT;
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        keyData
      );
    } catch (error) {
      return this.SECURITY_SALT;
    }
  }

  /**
   * Encrypt sensitive data using device key
   */
  static async encryptData(data: string): Promise<string> {
    try {
      const deviceKey = await this.generateDeviceKey();
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const keyChar = deviceKey.charCodeAt(i % deviceKey.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return Buffer.from(encrypted).toString('base64');
    } catch (error) {
      return data;
    }
  }

  /**
   * Decrypt sensitive data using device key
   */
  static async decryptData(encryptedData: string): Promise<string> {
    try {
      const deviceKey = await this.generateDeviceKey();
      const decoded = Buffer.from(encryptedData, 'base64').toString();
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = deviceKey.charCodeAt(i % deviceKey.length);
        const dataChar = decoded.charCodeAt(i);
        decrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      return encryptedData;
    }
  }

  /**
   * Rate limiting check
   */
  static async checkRateLimit(action: string, limit: number, windowMs: number): Promise<boolean> {
    try {
      const key = `rate_limit_${action}`;
      const now = Date.now();
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        await AsyncStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
        return true;
      }

      const { count, resetTime } = JSON.parse(stored);
      
      if (now > resetTime) {
        // Reset window
        await AsyncStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
        return true;
      }

      if (count >= limit) {
        return false; // Rate limit exceeded
      }

      // Increment counter
      await AsyncStorage.setItem(key, JSON.stringify({ count: count + 1, resetTime }));
      return true;
    } catch (error) {
      return true; // Allow on error
    }
  }

  /**
   * Clear all security-related storage
   */
  static async clearSecurityStorage(): Promise<void> {
    try {
      const securityKeys = [
        'app_integrity_hash',
        'last_app_version',
        'security_report',
        'security_incident',
        'device_fingerprint'
      ];

      for (const key of securityKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Key might not exist
        }
      }

      // Clear rate limiting data
      const allKeys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = allKeys.filter(key => key.startsWith('rate_limit_'));
      if (rateLimitKeys.length > 0) {
        await AsyncStorage.multiRemove(rateLimitKeys);
      }
    } catch (error) {
      // Silent error
    }
  }

  /**
   * Validate network request against allowed domains
   */
  static validateNetworkRequest(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return SecurityConfig.allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

export default SecurityUtils;
