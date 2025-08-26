import { Platform } from 'react-native';

interface AdConfig {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
}

class AdService {
  private static instance: AdService;
  private admobModule: any = null;
  private isInitialized = false;
  private config: AdConfig | null = null;
  private adBlockDetected = false;
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
  private adBlockCallback: ((detected: boolean) => void) | null = null;

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(
    config: AdConfig,
    enableAdBlockDetection = true,
    onAdBlockDetected?: (detected: boolean) => void
  ): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 AdMob already initialized');
      return true;
    }

    // Store config and callback, but intentionally skip importing expo-ads-admob
    // to avoid Metro resolving deprecated unimodules (@unimodules/core).
    this.config = config;
    this.adBlockCallback = onAdBlockDetected || null;

    console.log('📱 AdMob disabled (module not installed/unsupported in this environment). Skipping ads.');
    this.isInitialized = true;

    // Return false to indicate ads are not active; app will continue without ads.
    return false;
  }

  private setupAdBlockDetection() {
    console.log('📱 Setting up ad block detection');
    // Detection is now handled in individual ad methods
  }

  private onAdFailure() {
    this.consecutiveFailures++;
    console.warn(`🚫 Ad failure ${this.consecutiveFailures}/${this.maxFailures}`);
    if (this.consecutiveFailures >= this.maxFailures) {
      this.adBlockDetected = true;
      console.warn('🚫 Ad blocking detected - consecutive failures exceeded threshold');
      if (this.adBlockCallback) {
        this.adBlockCallback(true);
      }
    }
  }

  private onAdSuccess() {
    if (this.consecutiveFailures > 0) {
      console.log('✅ Ad loaded successfully - resetting failure count');
    }
    this.consecutiveFailures = 0;
    this.adBlockDetected = false;
    if (this.adBlockCallback) {
      this.adBlockCallback(false);
    }
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number }> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      return { success: false };
    }

    // In this environment, ads are disabled
    this.onAdFailure();
    return { success: false };
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      return false;
    }

    // In this environment, ads are disabled
    this.onAdFailure();
    return false;
  }

  isAdBlockDetected(): boolean {
    return this.adBlockDetected;
  }

  getConfig(): AdConfig | null {
    return this.config;
  }

  getAdBlockStatus(): { detected: boolean; failureCount: number } {
    return {
      detected: this.adBlockDetected,
      failureCount: this.consecutiveFailures,
    };
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  resetAdBlockDetection() {
    this.consecutiveFailures = 0;
    this.adBlockDetected = false;
    console.log('🔄 Ad block detection reset');
  }
}

export default AdService;