import AsyncStorage from '@react-native-async-storage/async-storage';
import AdService from './AdService';
import AdFreeService from './AdFreeService';

interface VideoWatchData {
  videosWatched: number;
  lastAdShown: number;
  sessionStartTime: number;
}

class VideoAdTracker {
  private static instance: VideoAdTracker;
  private videosWatched = 0;
  private readonly videosPerAd = 6;
  private isShowingAd = false;

  static getInstance(): VideoAdTracker {
    if (!VideoAdTracker.instance) {
      VideoAdTracker.instance = new VideoAdTracker();
    }
    return VideoAdTracker.instance;
  }

  async initialize(): Promise<void> {
    await this.loadWatchData();
  }

  private async loadWatchData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('videoWatchData');
      if (data) {
        const watchData: VideoWatchData = JSON.parse(data);
        
        // Reset counter if it's a new day or session is too old (24 hours)
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        if (now - watchData.sessionStartTime > dayInMs) {
          this.videosWatched = 0;
          await this.saveWatchData();
        } else {
          this.videosWatched = watchData.videosWatched;
        }
      }
    } catch (error) {
      this.videosWatched = 0;
    }
  }

  private async saveWatchData(): Promise<void> {
    try {
      const watchData: VideoWatchData = {
        videosWatched: this.videosWatched,
        lastAdShown: Date.now(),
        sessionStartTime: Date.now()
      };
      await AsyncStorage.setItem('videoWatchData', JSON.stringify(watchData));
    } catch (error) {
      // Error saving data
    }
  }

  async onVideoWatched(isVipUser = false): Promise<boolean> {
    if (isVipUser) {
      return false;
    }

    // Check if ad-free session is active
    const adFreeService = AdFreeService.getInstance();
    const isAdFree = await adFreeService.checkAdFreeStatus();
    
    if (isAdFree) {
      return false;
    }

    this.videosWatched++;

    // Check if we should show an ad
    if (this.videosWatched >= this.videosPerAd) {
      const adShown = await this.showInterstitialAd();
      if (adShown) {
        this.videosWatched = 0; // Reset counter after showing ad
      }
      await this.saveWatchData();
      return adShown;
    }

    await this.saveWatchData();
    return false;
  }

  private async showInterstitialAd(): Promise<boolean> {
    if (this.isShowingAd) {
      return false;
    }

    try {
      this.isShowingAd = true;
      const adService = AdService.getInstance();
      await adService.showInterstitialAd();
      return true;
    } catch (error) {
      return false;
    } finally {
      this.isShowingAd = false;
    }
  }

  getVideosWatched(): number {
    return this.videosWatched;
  }

  getVideosUntilNextAd(): number {
    return Math.max(0, this.videosPerAd - this.videosWatched);
  }

  async resetCounter(): Promise<void> {
    this.videosWatched = 0;
    await this.saveWatchData();
  }

  // For debugging
  async forceShowAd(): Promise<boolean> {
    return await this.showInterstitialAd();
  }
}

export default VideoAdTracker;
