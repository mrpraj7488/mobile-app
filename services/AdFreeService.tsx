import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getSupabase } from '../lib/supabase';

interface AdFreeSession {
  endTime: number;
  hours: number;
  sessionId?: string;
  userId?: string;
}

interface DatabaseSession {
  id: string;
  end_time: string;
  hours_purchased: number;
  time_remaining_seconds: number;
}

class AdFreeService {
  private static instance: AdFreeService;
  private isAdFreeActive = false;
  private sessionEndTime = 0;
  private currentUserId: string | null = null;
  private sessionId: string | null = null;
  private cacheInitialized = false;
  private lastCacheCheck = 0;
  private cacheValidityDuration = 30000; // 30 seconds cache validity
  private readonly SECURITY_SALT = 'vg_adfree_security_2024';
  private sessionHashes: Map<string, string> = new Map();
  private readonly SECRET_KEY = 'VG_ADFREE_SECURE_2024_HASH';
  private sessionNonces: Map<string, string> = new Map();
  private lastSecurityCheck = 0;
  private securityCheckInterval = 60000; // 1 minute
  private lastCleanupCheck = 0;
  private cleanupInterval = 300000; // 5 minutes

  static getInstance(): AdFreeService {
    if (!AdFreeService.instance) {
      AdFreeService.instance = new AdFreeService();
    }
    return AdFreeService.instance;
  }

  async initialize(userId?: string): Promise<void> {
    if (userId) {
      this.currentUserId = userId;
      await this.performSecurityValidation();
      await this.performPeriodicCleanup();
      await this.checkAdFreeStatus();
    }
  }

  // Security validation to prevent tampering
  private async performSecurityValidation(): Promise<boolean> {
    try {
      const now = Date.now();
      
      // Perform security checks only once per minute to avoid performance impact
      if (now - this.lastSecurityCheck < this.securityCheckInterval) {
        return true;
      }
      
      this.lastSecurityCheck = now;
      
      // Check for debugging attempts
      const debuggingDetected = this.detectDebuggingAttempts();
      if (debuggingDetected) {
        return false;
      }
      
      // Validate session integrity
      if (this.currentUserId) {
        const sessionValid = await this.validateSessionIntegrity();
        if (!sessionValid) {
          await this.clearLocalCache();
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Detect debugging and reverse engineering attempts
  private detectDebuggingAttempts(): boolean {
    try {
      // Skip debugging detection in development mode
      if (__DEV__) {
        return false;
      }
      
      // For production builds with test ads, skip debugging detection
      // Test ads are safe to use even with debugging
      return false;
      
      // Check for common debugging globals
      const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', 'chrome', 'webkitURL'];
      for (const global of suspiciousGlobals) {
        if (typeof (global as any) !== 'undefined') {
          return true;
        }
      }
      
      // Check for debugger usage (basic detection)
      const start = Date.now();
      
      let consoleAccess = false;
      try {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'console');
        if (descriptor?.configurable === false) {
          consoleAccess = true;
        }
      } catch (e) {
        consoleAccess = true;
      }
      
      const end = Date.now();
      const executionTime = end - start;
      
      if (executionTime > 100) {
        return true;
      }
      
      return consoleAccess;
    } catch (error) {
      return true; // Assume debugging if checks fail
    }
  }

  // Validate session integrity using cryptographic hashing
  private async validateSessionIntegrity(): Promise<boolean> {
    try {
      if (!this.sessionId || !this.currentUserId) {
        return true;
      }
      
      const storedHash = this.sessionHashes.get(this.sessionId);
      if (!storedHash) {
        return true;
      }
      
      const currentHash = await this.generateSessionHash(this.sessionId, this.currentUserId);
      return storedHash === currentHash;
    } catch (error) {
      return false;
    }
  }

  // Generate secure hash for session validation
  private async generateSessionHash(sessionId: string, userId: string): Promise<string> {
    const sessionData = `${userId}:${sessionId}:${this.sessionEndTime}`;
    const saltedData = `${sessionData}:${this.SECURITY_SALT}:${this.SECRET_KEY}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltedData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  // Perform periodic cleanup of expired sessions
  private async performPeriodicCleanup(): Promise<void> {
    try {
      const now = Date.now();
      
      // Perform cleanup only once per interval to avoid performance impact
      if (now - this.lastCleanupCheck < this.cleanupInterval) {
        return;
      }
      
      this.lastCleanupCheck = now;
      
      // Clean up expired ad-free sessions
      await this.cleanupExpiredSessions();
      
      // Clean up expired free coin sessions (if applicable)
      await this.cleanupExpiredCoinSessions();
      
    } catch (error) {
      // Periodic cleanup error
    }
  }

  // Clean up expired ad-free sessions from database
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // Delete expired ad-free sessions
      const { error } = await supabase.rpc('cleanup_expired_ad_sessions');
      
      if (error) {
        // Failed to cleanup expired sessions
      }
    } catch (error) {
      // Error during cleanup
    }
  }

  // Clean up expired free coin sessions from database
  private async cleanupExpiredCoinSessions(): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // Delete expired free coin sessions
      const { error } = await supabase.rpc('cleanup_expired_coin_sessions');
      
      if (error) {
        // Failed to cleanup expired coin sessions
      } else {
        // Successfully cleaned up expired coin sessions
      }
    } catch (error) {
      // Error during coin session cleanup
    }
  }

  // Clean up the current expired session specifically
  private async cleanupExpiredCurrentSession(): Promise<void> {
    if (!this.sessionId || !this.currentUserId) {
      return;
    }

    try {
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('user_ad_sessions')
        .delete()
        .eq('id', this.sessionId)
        .eq('user_id', this.currentUserId);
      
    } catch (error) {
      // Error during cleanup
    }
  }

  // Set current user and clear cache when user changes
  async setUser(userId: string | null): Promise<void> {
    if (this.currentUserId !== userId) {
      // User changed, clear local cache
      await this.clearLocalCache();
      this.currentUserId = userId;
      this.cacheInitialized = false;
      this.lastCacheCheck = 0;
      
      this.sessionHashes.clear();
      this.sessionNonces.clear();
    }
  }

  async checkAdFreeStatus(): Promise<boolean> {
    try {
      if (!this.currentUserId) {
        await this.clearLocalCache();
        return false;
      }

      // Perform security validation periodically
      const isSecure = await this.performSecurityValidation();
      if (!isSecure) {
        await this.clearLocalCache();
        return false;
      }

      const now = Date.now();
      
      // Check cache first for performance
      if (this.cacheInitialized && (now - this.lastCacheCheck) < this.cacheValidityDuration) {
        if (this.isAdFreeActive && now < this.sessionEndTime) {
          // Validate session integrity if we have session data
          if (this.sessionId && !await this.validateSessionIntegrity()) {
            await this.clearLocalCache();
            return false;
          }
          return true;
        } else if (this.isAdFreeActive && now >= this.sessionEndTime) {
          // Session expired, clear cache and cleanup database
          await this.cleanupExpiredCurrentSession();
          await this.clearLocalCache();
          return false;
        }
        return this.isAdFreeActive;
      }

      // Check local cache first
      const localResult = await this.checkLocalCache();
      if (localResult) {
        this.cacheInitialized = true;
        this.lastCacheCheck = now;
        return true;
      }

      // Fallback to database check
      const dbSession = await this.getActiveSessionFromDatabase();
      if (dbSession && dbSession.time_remaining_seconds > 0) {
        this.isAdFreeActive = true;
        this.sessionEndTime = new Date(dbSession.end_time).getTime();
        this.sessionId = dbSession.id;
        this.cacheInitialized = true;
        this.lastCacheCheck = now;

        // Generate security hash for the session from database
        if (this.sessionId) {
          const sessionData = `${this.currentUserId}:${this.sessionId}:${this.sessionEndTime}`;
          const sessionHash = await this.generateSessionHash(this.sessionId, this.currentUserId);
          this.sessionHashes.set(this.sessionId, sessionHash);
        }

        // Update local cache
        await this.updateLocalCache({
          endTime: this.sessionEndTime,
          hours: Math.ceil(dbSession.time_remaining_seconds / 3600),
          sessionId: this.sessionId || undefined,
          userId: this.currentUserId || undefined
        });

        return true;
      } else {
        // No active session found
        await this.clearLocalCache();
        return false;
      }
    } catch (error) {
      // Error checking ad-free status
      // Fallback to local cache on error
      return await this.checkLocalCache();
    }
  }

  private async getActiveSessionFromDatabase(): Promise<DatabaseSession | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .rpc('get_active_ad_session', { p_user_id: this.currentUserId });

      if (error) {
        // Database session check error
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      // Failed to get session from database
      return null;
    }
  }

  private async checkLocalCache(): Promise<boolean> {
    try {
      const sessionData = await AsyncStorage.getItem(`adFreeSession_${this.currentUserId}`);
      if (sessionData) {
        const session: AdFreeSession = JSON.parse(sessionData);
        
        // Validate session belongs to current user
        if (session.userId !== this.currentUserId) {
          await AsyncStorage.removeItem(`adFreeSession_${this.currentUserId}`);
          return false;
        }
        
        const now = Date.now();
        const isActive = now < session.endTime;
        
        this.isAdFreeActive = isActive;
        this.sessionEndTime = session.endTime;
        this.sessionId = session.sessionId || null;
        
        if (!isActive) {
          await this.clearLocalCache();
        }
        
        return isActive;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async syncFromDatabase(): Promise<void> {
    const dbSession = await this.getActiveSessionFromDatabase();
    
    if (dbSession && dbSession.time_remaining_seconds > 0) {
      this.isAdFreeActive = true;
      this.sessionEndTime = new Date(dbSession.end_time).getTime();
      this.sessionId = dbSession.id;
      
      await this.updateLocalCache({
        endTime: this.sessionEndTime,
        hours: dbSession.hours_purchased,
        sessionId: dbSession.id,
        userId: this.currentUserId!
      });
    } else {
      await this.clearLocalCache();
    }
  }

  isAdFree(): boolean {
    // Quick check without async operations for immediate UI response
    if (this.cacheInitialized) {
      const now = Date.now();
      if (this.isAdFreeActive && now >= this.sessionEndTime) {
        // Session expired, mark as inactive
        this.isAdFreeActive = false;
        return false;
      }
    }
    return this.isAdFreeActive;
  }

  // Fast synchronous check for UI components
  isAdFreeCached(): boolean {
    return this.isAdFreeActive && this.cacheInitialized;
  }

  getTimeRemaining(): number {
    if (!this.isAdFreeActive) return 0;
    const now = Date.now();
    return Math.max(0, this.sessionEndTime - now);
  }

  async startAdFreeSession(hours: number, adsWatched?: number): Promise<boolean> {
    try {
      if (!this.currentUserId) {
        throw new Error('No user ID available');
      }

      // Perform security validation before starting session
      const isSecure = await this.performSecurityValidation();
      if (!isSecure) {
        return false;
      }

      const supabase = getSupabase();
      
      const { data, error } = await supabase.rpc('start_ad_session', {
        p_user_id: this.currentUserId,
        p_hours: hours,
        p_ads_watched: adsWatched || 0
      });

      if (error) {
        // Try direct insert if RPC fails
        const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);
        const { data: insertData, error: insertError } = await supabase
          .from('user_ad_sessions')
          .insert({
            user_id: this.currentUserId,
            session_type: 'ad_free',
            hours_purchased: hours,
            ads_watched: adsWatched || 0,
            end_time: endTime.toISOString(),
            time_remaining_seconds: hours * 60 * 60,
            reward_amount: null, // No coin reward for ad-free sessions
            is_active: true
          })
          .select()
          .single();
          
        if (insertError) {
          return false;
        }
        
        if (insertData) {
          this.isAdFreeActive = true;
          this.sessionEndTime = endTime.getTime();
          this.sessionId = insertData.id;
          
          await this.updateLocalCache({
            endTime: this.sessionEndTime,
            hours: hours,
            sessionId: insertData.id,
            userId: this.currentUserId
          });
          
          return true;
        }
        return false;
      }

      if (data) {
        this.isAdFreeActive = true;
        this.sessionEndTime = Date.now() + (hours * 60 * 60 * 1000);
        this.sessionId = data;
        this.cacheInitialized = true;
        this.lastCacheCheck = Date.now();

        // Generate security hash for session integrity
        if (this.sessionId) {
          const sessionData = `${this.currentUserId}:${this.sessionId}:${this.sessionEndTime}`;
          const sessionHash = await this.generateSessionHash(this.sessionId, this.currentUserId);
          this.sessionHashes.set(this.sessionId, sessionHash);

          // Generate and store nonce for this session
          const nonce = await Crypto.randomUUID();
          this.sessionNonces.set(this.sessionId, nonce);
        }

        // Update local cache with security data
        await this.updateLocalCache({
          endTime: this.sessionEndTime,
          hours: hours,
          sessionId: this.sessionId || undefined,
          userId: this.currentUserId || undefined
        });

        return true;
      }

      return false;
    } catch (error) {
      // Error starting ad-free session
      return false;
    }
  }

  async endAdFreeSession(): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      const supabase = getSupabase();
      
      // Delete all active ad-free sessions for this user
      const { error } = await supabase
        .from('user_ad_sessions')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('session_type', 'ad_free')
        .or('is_active.eq.true,end_time.lt.now()');
        
      if (error) {
        // If delete fails, try to mark as inactive
        await supabase
          .from('user_ad_sessions')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', this.currentUserId)
          .eq('session_type', 'ad_free')
          .eq('is_active', true);
      }
    } catch (error) {
      // Error ending session
    }
    
    // Clear local state
    this.isAdFreeActive = false;
    this.sessionEndTime = 0;
    this.sessionId = null;

    if (this.sessionId) {
      this.sessionHashes.delete(this.sessionId);
      this.sessionNonces.delete(this.sessionId);
    }

    await this.clearLocalCache();
  }

  private async updateLocalCache(session: AdFreeSession): Promise<void> {
    try {
      const sessionData: AdFreeSession = {
        endTime: session.endTime,
        hours: session.hours,
        sessionId: session.sessionId || '',
        userId: session.userId || ''
      };
      
      await AsyncStorage.setItem(`adFreeSession_${this.currentUserId}`, JSON.stringify(sessionData));
      this.cacheInitialized = true;
      this.lastCacheCheck = Date.now();
    } catch (error) {
      // Error updating cache
    }
  }

  private async clearLocalCache(): Promise<void> {
    try {
      if (this.currentUserId) {
        await AsyncStorage.removeItem(`adFreeSession_${this.currentUserId}`);
      }
      
      // Also clear old format cache
      await AsyncStorage.removeItem('adFreeSession');
      
      this.isAdFreeActive = false;
      this.sessionEndTime = 0;
      this.sessionId = null;
      this.cacheInitialized = false;
      this.lastCacheCheck = 0;
    } catch (error) {
      // Failed to clear cache
    }
  }

  // Method to call when user logs out
  async logout(): Promise<void> {
    await this.clearLocalCache();
    this.currentUserId = null;
  }

  formatTimeRemaining(): string {
    const seconds = this.getTimeRemaining();
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

export default AdFreeService;
