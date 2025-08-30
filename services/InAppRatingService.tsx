import { Platform, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '../lib/supabase';

export interface RatingResult {
  success: boolean;
  rewarded: boolean;
  message: string;
  coinsEarned?: number;
}

class InAppRatingService {
  private static instance: InAppRatingService;
  private readonly RATING_STORAGE_KEY = 'user_has_rated_app';
  private readonly RATING_REWARD_COINS = 100;

  static getInstance(): InAppRatingService {
    if (!InAppRatingService.instance) {
      InAppRatingService.instance = new InAppRatingService();
    }
    return InAppRatingService.instance;
  }

  /**
   * Check if the user has already rated the app
   */
  async hasUserRated(): Promise<boolean> {
    try {
      const hasRated = await AsyncStorage.getItem(this.RATING_STORAGE_KEY);
      return hasRated === 'true';
    } catch (error) {
      console.error('Error checking rating status:', error);
      return false;
    }
  }

  /**
   * Check if in-app review is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await StoreReview.isAvailableAsync();
    } catch (error) {
      console.error('Error checking in-app review availability:', error);
      return false;
    }
  }

  /**
   * Request in-app review and handle coin rewards
   */
  async requestReview(userId?: string): Promise<RatingResult> {
    try {
      // Check if user has already rated
      const hasRated = await this.hasUserRated();
      if (hasRated) {
        return {
          success: false,
          rewarded: false,
          message: 'You have already rated VidGro. Thank you for your support!'
        };
      }

      // Check if in-app review is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        // Fallback to store URL if in-app review is not available
        return await this.openStoreForRating(userId);
      }

      // Request in-app review
      await StoreReview.requestReview();

      // Mark as rated and award coins immediately after requesting review
      await this.markAsRated();
      
      if (userId) {
        const rewardResult = await this.awardRatingCoins(userId);
        if (rewardResult.success) {
          return {
            success: true,
            rewarded: true,
            message: `Thank you for rating VidGro! You've earned ${this.RATING_REWARD_COINS} coins as a reward.`,
            coinsEarned: this.RATING_REWARD_COINS
          };
        }
      }

      return {
        success: true,
        rewarded: false,
        message: 'Thank you for rating VidGro! Your feedback helps us improve.'
      };

    } catch (error) {
      console.error('Error requesting in-app review:', error);
      
      // Fallback to store URL on error
      return await this.openStoreForRating(userId);
    }
  }

  /**
   * Open app store for rating (fallback method)
   */
  private async openStoreForRating(userId?: string): Promise<RatingResult> {
    try {
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/vidgro/id123456789', // Replace with actual App Store ID
        android: 'https://play.google.com/store/apps/details?id=com.vidgro.app', // Replace with actual package name
        default: 'https://vidgro.app'
      });

      if (storeUrl) {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
          
          // Mark as rated and award coins for fallback method too
          await this.markAsRated();
          
          if (userId) {
            const rewardResult = await this.awardRatingCoins(userId);
            if (rewardResult.success) {
              return {
                success: true,
                rewarded: true,
                message: `Thank you for rating VidGro! You've earned ${this.RATING_REWARD_COINS} coins as a reward. Please complete your rating in the app store.`,
                coinsEarned: this.RATING_REWARD_COINS
              };
            }
          }
          
          return {
            success: true,
            rewarded: false,
            message: 'Please rate VidGro in the app store. Your feedback is valuable to us!'
          };
        }
      }
      
      return {
        success: false,
        rewarded: false,
        message: 'Unable to open app store. Please search for VidGro in your app store and leave a review.'
      };

    } catch (error) {
      console.error('Error opening store for rating:', error);
      return {
        success: false,
        rewarded: false,
        message: 'Unable to open rating dialog. Please try again later.'
      };
    }
  }

  /**
   * Mark user as having rated the app
   */
  private async markAsRated(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.RATING_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Error marking user as rated:', error);
    }
  }

  /**
   * Award coins for rating the app
   */
  private async awardRatingCoins(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: `rating_${Date.now()}_${userId.substring(0, 8)}`,
          user_id: userId,
          amount: this.RATING_REWARD_COINS,
          transaction_type: 'rating_reward',
          description: 'Coins earned for rating VidGro app',
          metadata: {
            platform: Platform.OS,
            rating_method: 'in_app_review'
          }
        });

      if (transactionError) {
        throw transactionError;
      }

      // Update user's coin balance
      const { error: updateError } = await supabase.rpc('increment_user_coins', {
        user_id: userId,
        coin_amount: this.RATING_REWARD_COINS
      });

      if (updateError) {
        throw updateError;
      }

      return { success: true };

    } catch (error) {
      console.error('Error awarding rating coins:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset rating status (for testing purposes)
   */
  async resetRatingStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.RATING_STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting rating status:', error);
    }
  }

  /**
   * Get rating statistics
   */
  async getRatingStats(): Promise<{ hasRated: boolean; isAvailable: boolean }> {
    const hasRated = await this.hasUserRated();
    const isAvailable = await this.isAvailable();
    
    return {
      hasRated,
      isAvailable
    };
  }
}

export default InAppRatingService;
