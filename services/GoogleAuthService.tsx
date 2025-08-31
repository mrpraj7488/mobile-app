import { Platform } from 'react-native';
import { getSupabase } from '../lib/supabase';

// Safely import Google Sign-In to avoid crashes in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('Google Sign-In module not available (likely running in Expo Go)');
}

interface GoogleAuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isConfigured = false;

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Configure Google Sign-In
   */
  private async configure(): Promise<void> {
    if (this.isConfigured) return;

    if (!GoogleSignin) {
      throw new Error('Google Sign-In module not available. This feature requires a production build.');
    }

    try {
      await GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1033563114223-vl0aibcvugbv47k1eesosg98o0338hti.apps.googleusercontent.com',
        offlineAccess: false, // Disable offline access to prevent caching
        hostedDomain: '',
        forceCodeForRefreshToken: false, // Disable to prevent "signing back in" message
      });
      this.isConfigured = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign in with Google using native authentication
   */
  async signInWithGoogle(referralCode?: string): Promise<GoogleAuthResult> {
    try {
      await this.configure();

      // Check if device has Google Play Services
      await GoogleSignin.hasPlayServices();

      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in to Supabase with Google ID token and pass referral code in metadata
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
        options: {
          data: {
            referral_code: referralCode || null
          }
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      let errorMessage = 'Failed to sign in with Google';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }


  /**
   * Ensure user profile exists in profiles table - using same pattern as email signup
   */
  private async ensureUserProfile(user: any, referralCode?: string): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        return;
      }

      // Use the same RPC function as email signup for consistency
      const { data: createResult, error: createError } = await supabase
        .rpc('create_missing_profile', {
          p_user_id: user.id,
          p_email: user.email,
          p_username: user.email?.split('@')[0] || 'user',
          p_referral_code: referralCode
        });

      if (createError) {
        console.error('Failed to create profile via RPC:', createError);
        throw createError;
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      throw error;
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate unique referral code
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Handle referral code processing
   */
  private async handleReferralCode(userId: string, referralCode: string): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Find the referrer by referral code
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .eq('referral_code', referralCode)
        .single();

      if (referrerError || !referrer) {
        // Invalid referral code
        return;
      }

      // Don't allow self-referral
      if (referrer.id === userId) {
        // Self-referral not allowed
        return;
      }

      // Check if user already used a referral code
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_user_id', userId)
        .single();

      if (existingReferral) {
        // User already used a referral code
        return;
      }

      // Create referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_user_id: userId,
          referral_code: referralCode,
          status: 'completed'
        });

      if (referralError) {
        console.error('Error creating referral record:', referralError);
        return;
      }

      // Award coins to both users
      const REFERRAL_BONUS = 500;

      // Award coins to referrer
      await supabase
        .from('transactions')
        .insert({
          transaction_id: `referral_bonus_${Date.now()}_${referrer.id.substring(0, 8)}`,
          user_id: referrer.id,
          amount: REFERRAL_BONUS,
          transaction_type: 'referral_bonus',
          description: 'Referral bonus for inviting a friend',
          metadata: {
            referred_user_id: userId,
            referral_code: referralCode
          }
        });

      // Award coins to new user
      await supabase
        .from('transactions')
        .insert({
          transaction_id: `welcome_bonus_${Date.now()}_${userId.substring(0, 8)}`,
          user_id: userId,
          amount: REFERRAL_BONUS,
          transaction_type: 'welcome_bonus',
          description: 'Welcome bonus for joining with referral code',
          metadata: {
            referrer_id: referrer.id,
            referral_code: referralCode
          }
        });

      // Update coin balances
      await supabase.rpc('increment_user_coins', {
        user_id: referrer.id,
        coin_amount: REFERRAL_BONUS
      });

      await supabase.rpc('increment_user_coins', {
        user_id: userId,
        coin_amount: REFERRAL_BONUS
      });

    } catch (error) {
      console.error('Error handling referral code:', error);
    }
  }

  /**
   * Sign out from Google and Supabase
   */
  async signOut(): Promise<void> {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Sign out from Supabase
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}

export default GoogleAuthService;
