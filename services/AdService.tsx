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
      return true;
    }

    // Store config and callback, but intentionally skip importing expo-ads-admob
    // to avoid Metro resolving deprecated unimodules (@unimodules/core).
    this.config = config;
    this.adBlockCallback = onAdBlockDetected || null;

    this.isInitialized = true;
    return false;
  }

  private setupAdBlockDetection() {
    // Detection is now handled in individual ad methods
  }

  private onAdFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxFailures) {
      this.adBlockDetected = true;
      if (this.adBlockCallback) {
        this.adBlockCallback(true);
      }
    }
  }

  private onAdSuccess() {
    this.consecutiveFailures = 0;
    this.adBlockDetected = false;
    if (this.adBlockCallback) {
      this.adBlockCallback(false);
    }
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number }> {
    if (!this.isInitialized || !this.config) {
      return { success: false };
    }

    this.onAdFailure();
    return { success: false };
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      return false;
    }

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
  }
}

export default AdService;