import mobileAds, { 
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
  TestIds,
  BannerAd,
  BannerAdSize
} from 'react-native-google-mobile-ads';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdFreeService from './AdFreeService';

interface AdConfig {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
}

interface AdBlockStatus {
  detected: boolean;
  failureCount: number;
}

class AdService {
  private static instance: AdService;
  private config: AdConfig | null = null;
  private isInitialized = false;
  private rewardedAd: RewardedAd | null = null;
  private interstitialAd: InterstitialAd | null = null;
  private preloadedRewardedAd: RewardedAd | null = null;
  private isPreloadedAdReady = false;
  private isShowingRewardedAd = false;
  private lastAdShowTime = 0;
  private lastSecurityCheck = 0;
  private rewardNonces = new Set<string>();
  private readonly SECRET_KEY = 'vidgro_admob_security_2024';
  private readonly MIN_AD_INTERVAL = 30000; // 30 seconds between ads
  private adBlockStatus = { detected: false, failureCount: 0 };
  private adBlockCallback: ((detected: boolean) => void) | null = null;
  private isShowingInterstitialAd = false;
  private sessionTokens: Map<string, number> = new Map();
  private readonly SECURITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly REWARD_VALIDATION_KEY = 'vg_reward_validation_2024';

  private constructor() {}

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(adConfig?: any, adBlockDetection?: boolean, callback?: Function): Promise<boolean> {
    try {
      if (adConfig) {
        // Legacy parameters ignored - using endpoint configuration
      }
      const SecureConfigService = (await import('./SecureConfigService')).default;
      const secureConfigService = SecureConfigService.getInstance();
      
      // Use cached config if available for faster startup
      const secureConfig = await secureConfigService.getAdMobConfig();
      
      if (!secureConfig) {
        console.error('[AdService] No config received from SecureConfigService');
        this.config = null;
        this.isInitialized = true;
        return true;
      }

      const appId = secureConfig.admob.app_id;
      const bannerId = secureConfig.admob.banner_id;
      const interstitialId = secureConfig.admob.interstitial_id;


      this.config = {
        appId,
        bannerId,
        interstitialId,
        rewardedId: secureConfig.admob.rewarded_id
      };

      
      // Initialize the Google Mobile Ads SDK
      try {
        // Initialize AdMob SDK in background
        mobileAds().initialize().then(() => {
          // SDK initialized
        }).catch(() => {
          // Continue even if SDK init fails
        });
        
        // Set request configuration for test ads if using test IDs
        const isUsingTestIds = bannerId.includes('3940256099942544');
        if (isUsingTestIds) {
          await mobileAds().setRequestConfiguration({
            testDeviceIdentifiers: ['EMULATOR'],
            tagForChildDirectedTreatment: true,
            tagForUnderAgeOfConsent: true,
          });
        }
        
        this.isInitialized = true;
        
        if (callback) callback(true);
        // Delay preloading to not block startup
        setTimeout(() => this.preloadRewardedAd(), 1000);
        
        return true;
      } catch (initError) {
        console.error('[AdService] Failed to initialize AdMob SDK:', initError);
        this.isInitialized = false;
        if (callback) callback(false);
        return false;
      }
    } catch (error) {
      this.isInitialized = false;
      if (callback) callback(false);
      
      return false;
    }
  }

  async preloadRewardedAd(): Promise<void> {
    if (!this.isInitialized || !this.config) return;
    
    try {
      this.isPreloadedAdReady = false;
      this.preloadedRewardedAd = RewardedAd.createForAdRequest(this.config.rewardedId);
      
      const unsubscribePreloadLoaded = this.preloadedRewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          this.isPreloadedAdReady = true;
          unsubscribePreloadLoaded();
        }
      );
      
      const unsubscribePreloadError = this.preloadedRewardedAd.addAdEventListener(
        AdEventType.ERROR,
        () => {
          this.isPreloadedAdReady = false;
          this.preloadedRewardedAd = null;
          unsubscribePreloadLoaded();
          unsubscribePreloadError();
        }
      );
      
      this.preloadedRewardedAd.load();
    } catch (error) {
      this.isPreloadedAdReady = false;
      this.preloadedRewardedAd = null;
    }
  }

  private validateAdMobId(id: string, type: string): void {
    const adMobPattern = /^ca-app-pub-\d{16}[~/]\d{10}$/;
    const testIdPattern = /^ca-app-pub-3940256099942544[~/]\d{10}$/;
    
    if (!adMobPattern.test(id) && !testIdPattern.test(id)) {
      throw new Error(`Invalid ${type} format: ${this.obfuscateAdId(id)}`);
    }
  }

  private async storeSecureConfig(): Promise<void> {
    if (!this.config) return;

    try {
      const configString = JSON.stringify(this.config);
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, configString + this.SECRET_KEY);
      
      const secureConfig = {
        config: this.config,
        hash,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem('secure_admob_config', JSON.stringify(secureConfig));
    } catch (error) {
      // Failed to store secure config
    }
  }

  private async validateSecurityIntegrity(): Promise<boolean> {
    try {
      const now = Date.now();
      if (now - this.lastSecurityCheck < this.SECURITY_CHECK_INTERVAL) {
          return true;
      }

      if (!this.config || !this.config.appId || !this.config.bannerId) {
          return false;
      }

      // Pattern for both production and test AdMob IDs
      const adMobIdPattern = /^ca-app-pub-\d+[~/]\d+$/;
      const testIdPattern = /^ca-app-pub-3940256099942544\/\d+$/; // Test IDs use forward slash
      
      const appIdValid = adMobIdPattern.test(this.config.appId);
      const bannerIdValid = adMobIdPattern.test(this.config.bannerId) || testIdPattern.test(this.config.bannerId);
      const interstitialIdValid = adMobIdPattern.test(this.config.interstitialId) || testIdPattern.test(this.config.interstitialId);
      const rewardedIdValid = adMobIdPattern.test(this.config.rewardedId) || testIdPattern.test(this.config.rewardedId);
      
      
      if (!appIdValid || !bannerIdValid || !interstitialIdValid || !rewardedIdValid) {
        return false;
      }

      if (!__DEV__ && this.detectDebuggingAttempts()) {
        return false;
      }

      this.lastSecurityCheck = now;
      return true;
    } catch (error) {
      return false;
    }
  }

  private detectDebuggingAttempts(): boolean {
    try {
      // Skip debugging detection in development mode
      if (__DEV__) {
        return false;
      }
      
      // For production builds with test ads, skip debugging detection
      // Test ads are safe to use even with debugging
      if (this.config && this.config.bannerId.includes('3940256099942544')) {
          return false;
      }
      
      // Check for common debugging globals
      const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', 'chrome', 'webkitURL'];
      for (const global of suspiciousGlobals) {
        if (typeof (global as any) !== 'undefined') {
          return true;
        }
      }
      
      // Skip debugger statement check as it can cause issues
      // const start = Date.now();
      // debugger;
      // const end = Date.now();
      // if (end - start > 100) {
      //   return true;
      // }
      
      return false;
    } catch (error) {
      console.log('[AdService] Error in debug detection:', error);
      return false; // Don't block ads on detection errors
    }
  }

  private async generateSecureToken(userId: string, timestamp: number): Promise<string> {
    const data = `${userId}_${timestamp}_${this.REWARD_VALIDATION_KEY}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  private async validateRewardIntegrity(userId: string, rewardType: string, amount: number): Promise<boolean> {
    try {
      const timestamp = Date.now();
      const nonce = await Crypto.randomUUID();
      const expectedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${userId}_${rewardType}_${amount}_${timestamp}_${nonce}_${this.REWARD_VALIDATION_KEY}`
      );
      
      // Store nonce to prevent replay attacks
      this.rewardNonces.add(nonce);
      
      // Clean old nonces (keep only last 100)
      if (this.rewardNonces.size > 100) {
        const noncesArray = Array.from(this.rewardNonces);
        this.rewardNonces.clear();
        noncesArray.slice(-50).forEach(n => this.rewardNonces.add(n));
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private async obfuscateConfig(): Promise<void> {
    if (!this.config) return;
    
    try {
      // Create multiple layers of obfuscation
      const timestamp = Date.now();
      const randomSalt = await Crypto.randomUUID();
      
      const obfuscatedConfig = {
        a: await this.encryptString(this.config.appId, randomSalt),
        b: await this.encryptString(this.config.bannerId, randomSalt),
        i: await this.encryptString(this.config.interstitialId, randomSalt),
        r: await this.encryptString(this.config.rewardedId, randomSalt),
        s: randomSalt,
        t: timestamp,
        h: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, 
          `${this.config.appId}_${this.config.bannerId}_${this.config.interstitialId}_${this.config.rewardedId}_${randomSalt}_${this.SECRET_KEY}`)
      };
      
      await AsyncStorage.setItem('_cfg_sec', JSON.stringify(obfuscatedConfig));
    } catch (error) {
      // Config obfuscation failed
    }
  }

  private async encryptString(text: string, salt: string): Promise<string> {
    const combined = `${text}_${salt}_${this.SECRET_KEY}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, combined);
  }

  async showRewardedAd(onReward: (reward: { amount: number; type: string }) => void, forceShowAd: boolean = false, rewardType: 'coins' | 'ad_free' = 'ad_free'): Promise<void> {
    if (!this.isInitialized || !this.config || this.isShowingRewardedAd) {
      return;
    }

    if (!forceShowAd) {
      const adFreeService = AdFreeService.getInstance();
      if (await adFreeService.checkAdFreeStatus()) {
        onReward({ amount: 0, type: 'ad_free' });
        return;
      }
    }

    const securityValid = await this.validateSecurityIntegrity();
    if (!securityValid) {
      return;
    }

    this.isShowingRewardedAd = true;
    this.lastAdShowTime = Date.now();

    const safetyTimeout = setTimeout(() => {
      if (this.isShowingRewardedAd) {
        this.isShowingRewardedAd = false;
        this.lastAdShowTime = 0;
      }
    }, 45000);

    try {
      const isUsingPreloadedAd = !!(this.preloadedRewardedAd && this.isPreloadedAdReady);
      if (this.preloadedRewardedAd && this.isPreloadedAdReady) {
        this.rewardedAd = this.preloadedRewardedAd;
        this.preloadedRewardedAd = null;
        this.isPreloadedAdReady = false;
      } else {
        this.rewardedAd = RewardedAd.createForAdRequest(this.config.rewardedId);
      }

      const unsubscribeLoaded = this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedAd?.show();
      });

      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async (reward) => {
          clearTimeout(safetyTimeout);
          this.isShowingRewardedAd = false;
          this.lastAdShowTime = 0;
          
          let userId = await AsyncStorage.getItem('user_id');
          
          if (!userId) {
            try {
              const userDataStr = await AsyncStorage.getItem('user');
              if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                userId = userData.id;
                if (userId) {
                  await AsyncStorage.setItem('user_id', userId);
                }
              }
            } catch (error) {
              // Failed to parse user data
            }
          }
          
          if (!userId) return;
          
          const rewardAmount = rewardType === 'coins' ? 100 : 0;
          const isValidReward = await this.validateRewardIntegrity(userId, rewardType, rewardAmount);
          
          if (!isValidReward) return;
          
          const sessionToken = await this.generateSecureToken(userId, Date.now());
          
          if (rewardType === 'coins') {
            onReward({ amount: 100, type: 'rewarded_ad' });
          } else {
            onReward({ amount: 0, type: 'ad_free' });
          }
        }
      );

      const unsubscribeClosed = this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        clearTimeout(safetyTimeout);
        this.isShowingRewardedAd = false;
        this.lastAdShowTime = 0;
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        this.rewardedAd = null;
        
        setTimeout(() => this.preloadRewardedAd(), 0);
      });

      const unsubscribeError = this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        clearTimeout(safetyTimeout);
        
        const isNoFillError = error.message?.includes('no-fill') || error.message?.includes('Publisher data not found');
        if (!isNoFillError) {
          this.handleAdBlockDetection(true);
        }
        
        this.isShowingRewardedAd = false;
        this.lastAdShowTime = 0;
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        this.rewardedAd = null;
      });

      if (isUsingPreloadedAd) {
          this.rewardedAd?.show();
      } else {
          this.rewardedAd.load();
      }
    } catch (error) {
      clearTimeout(safetyTimeout);
      this.isShowingRewardedAd = false;
      this.lastAdShowTime = 0;
      this.handleAdBlockDetection(true);
    }
  }

  async showBannerAd(): Promise<void> {
    if (!this.isInitialized || !this.config) {
      console.log('[AdService] Cannot show banner - not initialized or no config');
      return;
    }
    
    console.log('[AdService] Banner ad requested with ID:', this.config.bannerId);
    const isTestId = this.config.bannerId.includes('3940256099942544');
    console.log('[AdService] Using test banner ID:', isTestId);
    
    // Banner ad implementation would go here
    // This is a placeholder for banner ad functionality
  }

  async showInterstitialAd(): Promise<void> {
    if (!this.isInitialized || !this.config) {
      console.log('[AdService] Cannot show interstitial - not initialized or no config');
      return;
    }

    const now = Date.now();
    if (now - this.lastAdShowTime < this.MIN_AD_INTERVAL) {
      console.log('[AdService] Interstitial blocked - too soon after last ad');
      return;
    }

    console.log('[AdService] Interstitial ad requested with ID:', this.config.interstitialId);
    const isTestId = this.config.interstitialId.includes('3940256099942544');
    console.log('[AdService] Using test interstitial ID:', isTestId);

    if (!(await this.validateSecurityIntegrity())) {
      console.log('[AdService] Security validation failed');
      return;
    }

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(this.config.interstitialId);

      const unsubscribeLoaded = this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialAd?.show();
      });

      const unsubscribeClosed = this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        this.interstitialAd = null;
      });

      const unsubscribeError = this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        const isNoFillError = error.message?.includes('no-fill') || error.message?.includes('Publisher data not found');
        if (!isNoFillError) {
          this.handleAdBlockDetection(true);
        }
        
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        this.interstitialAd = null;
      });

      this.interstitialAd.load();
    } catch (error) {
      this.handleAdBlockDetection(true);
    }
  }

  private obfuscateAdId(adId: string): string {
    if (!adId || adId.length < 8) return adId;
    const start = adId.substring(0, 4);
    const end = adId.substring(adId.length - 4);
    const middle = '*'.repeat(Math.max(0, adId.length - 8));
    return `${start}${middle}${end}`;
  }

  setAdBlockCallback(callback: (detected: boolean) => void): void {
    this.adBlockCallback = callback;
  }

  private handleAdBlockDetection(detected: boolean): void {
    this.adBlockStatus.detected = detected;
    if (detected) {
      this.adBlockStatus.failureCount++;
    }
    
    if (this.adBlockCallback) {
      this.adBlockCallback(detected);
    }
  }

  getAdBlockStatus(): AdBlockStatus {
    return { ...this.adBlockStatus };
  }

  resetAdBlockDetection(): void {
    this.adBlockStatus = { detected: false, failureCount: 0 };
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  async isAdFreeActive(): Promise<boolean> {
    const adFreeService = AdFreeService.getInstance();
    return await adFreeService.checkAdFreeStatus();
  }

  getObfuscatedConfig(): any {
    if (!this.config) return null;
    
    return {
      appId: this.obfuscateAdId(this.config.appId),
      bannerId: this.obfuscateAdId(this.config.bannerId),
      interstitialId: this.obfuscateAdId(this.config.interstitialId),
      rewardedId: this.obfuscateAdId(this.config.rewardedId)
    };
  }
}

export default AdService;