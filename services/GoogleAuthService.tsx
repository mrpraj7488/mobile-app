import { getSupabase } from '../lib/supabase';
import DebugLogger from '../utils/DebugLogger';
import { Alert } from 'react-native';

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
  isNewUser?: boolean;
  requiresConsent?: boolean;
  pendingAuth?: {
    idToken: string;
    email: string;
    name: string | null;
    photo: string | null;
  };
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private logger = DebugLogger.getInstance();
  private isConfigured = false;
  private configurationPromise: Promise<void> | null = null;

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Configure Google Sign-In ONCE with optimal settings
   * This should be called only during app initialization
   */
  async initialize(): Promise<void> {
    if (this.configurationPromise) {
      return this.configurationPromise;
    }

    this.configurationPromise = this.configureGoogleSignIn();
    return this.configurationPromise;
  }

  private async configureGoogleSignIn(): Promise<void> {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In module not available. This feature requires a production build.');
    }


    if (this.isConfigured) {
      this.logger.info('GoogleAuth', 'Already configured, skipping');
      return;
    }

    try {
      if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
        await GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          scopes: ['email'], // Minimal scope - only email, no profile to avoid consent
          offlineAccess: false, // No offline access to prevent consent
          hostedDomain: '',
          forceCodeForRefreshToken: false, // Never force consent
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        });
        
        this.isConfigured = true;
      } else {
        throw new Error('GoogleSignin.configure is not available');
      }
    } catch (error) {
      this.logger.error('GoogleAuth', 'Configuration failed', error);
      this.configurationPromise = null; // Reset to allow retry
      throw error;
    }
  }

  /**
   * Main sign-in method with optimized flow
   */
  async signInWithGoogle(referralCode?: string): Promise<GoogleAuthResult> {
    
    try {
      // Ensure Google Sign-In is configured
      await this.initialize();
      
      // Check if device has Google Play Services
      let hasPlayServices = false;
      try {
        if (GoogleSignin && typeof GoogleSignin.hasPlayServices === 'function') {
          hasPlayServices = await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
        } else {
          hasPlayServices = true; // Assume available if method doesn't exist
        }
      } catch (error) {
        hasPlayServices = true; // Assume available if check fails
      }
      
      if (!hasPlayServices) {
        throw new Error('Google Play Services not available');
      }
      
      
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      let userInfo;
      let usedSilentSignIn = false;

      // FORCE complete logout first to ensure fresh authentication
      await this.forceCompleteLogout();
      
      // For logged-out users, always show email selection first (no silent sign-in)
      // This ensures users can choose their account and see the proper flow
      try {
        if (GoogleSignin && typeof GoogleSignin.signIn === 'function') {
          // Always use interactive sign-in to show email selection
          // Configure to skip consent screen and only show account selection
          userInfo = await GoogleSignin.signIn({
            prompt: 'select_account', // Only show account selection, skip consent
          });
        } else {
          throw new Error('GoogleSignin.signIn is not available');
        }
      } catch (interactiveError: any) {
        if (interactiveError.code === statusCodes?.SIGN_IN_CANCELLED) {
          throw new Error('Sign-in was cancelled by user');
        } else if (interactiveError.code === statusCodes?.IN_PROGRESS) {
          throw new Error('Sign-in already in progress');
        } else {
          throw interactiveError;
        }
      }

      // Extract user data with multiple fallback paths
      const userData = this.extractUserData(userInfo);
      const { email, idToken, name, photo } = userData;
      
      if (!email || !idToken) {
        this.logger.error('GoogleAuth', 'Missing required data from Google response:', userData);
        throw new Error('Invalid response from Google sign-in');
      }


      // Check if user is new AFTER successful Google authentication
      const isNewUser = await this.checkIfNewUser(email);
      
      
      // For new users, return early to let the UI handle consent
      if (isNewUser) {
        return {
          success: true,
          user: null, // Don't create user yet, wait for consent
          isNewUser: true,
          pendingAuth: {
            idToken,
            email,
            name,
            photo
          }
        };
      }
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        this.logger.error('GoogleAuth', 'Supabase authentication failed', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('No user data returned from Supabase');
      }


      // Ensure user profile exists (only for new users or if profile missing)
      await this.ensureUserProfile(data.user.id, email, name, photo, referralCode, isNewUser);

      return {
        success: true,
        user: data.user,
        isNewUser: isNewUser
      };
    } catch (error) {
      let errorMessage = 'Failed to sign in with Google';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      this.logger.error('GoogleAuth', 'Google sign-in failed:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Extract user data from Google response with comprehensive fallback paths
   */
  private extractUserData(userInfo: any): {
    email: string | null;
    idToken: string | null;
    name: string | null;
    photo: string | null;
  } {

    // Early return if no userInfo or if it's the "noSavedCredentialFound" response
    if (!userInfo || userInfo.type === 'noSavedCredentialFound') {
      return {
        email: null,
        idToken: null,
        name: null,
        photo: null,
      };
    }

    // Handle different response structures
    const data = userInfo?.data || userInfo;
    const user = data?.user || userInfo?.user || userInfo;
    
    // Try multiple extraction paths
    const email = user?.email || data?.email || userInfo?.email || 
                  user?.basicProfile?.email || userInfo?.basicProfile?.email;
    
    const idToken = data?.idToken || userInfo?.idToken || 
                    data?.accessToken || userInfo?.accessToken ||
                    user?.idToken || userInfo?.serverAuthCode;
    
    const name = user?.name || data?.name || user?.givenName || 
                 user?.displayName || user?.basicProfile?.name ||
                 userInfo?.name || userInfo?.displayName;
    
    const photo = user?.photo || data?.photo || user?.photoURL || 
                  user?.basicProfile?.imageUrl || userInfo?.photo ||
                  userInfo?.photoURL;

    const result = {
      email: email || null,
      idToken: idToken || null,
      name: name || null,
      photo: photo || null,
    };

    return result;
  }

  /**
   * Check if user is new by looking for existing profile
   */
  private async checkIfNewUser(email: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return true;
      }
      
      // Use RPC function to bypass RLS policies
      const { data: profileExists, error } = await supabase.rpc('check_profile_exists_by_email', { 
        user_email: email 
      });
      
      if (error) {
        return true;
      }
      
      return !profileExists;
    } catch (error) {
      return true;
    }
  }

  /**
   * Ensure user profile exists in Supabase
   */
  private async ensureUserProfile(
    userId: string, 
    email: string, 
    name: string | null, 
    photo: string | null, 
    referralCode?: string,
    isNewUser: boolean = false
  ): Promise<void> {
    
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        return;
      }

      // Use create_missing_profile function which handles welcome bonus, referral rewards, and transaction records
      const username = name || email.split('@')[0];
      
      const { data: createResult, error: createError } = await supabase.rpc('create_missing_profile', {
        p_user_id: userId,
        p_email: email,
        p_username: username,
        p_referral_code: referralCode || null
      });
      
      if (createError) {
        return;
      }
      
      if (createResult?.success && photo) {
        // Update avatar if provided (create_missing_profile doesn't handle this)
        await supabase
          .from('profiles')
          .update({ avatar_url: photo })
          .eq('id', userId);
      }
    } catch (error) {
      // Don't throw - profile creation shouldn't block authentication
    }
  }

  /**
   * Generate a random referral code
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Removed handleReferralReward method - now handled by create_missing_profile function

  /**
   * Check current sign-in status
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      if (!GoogleSignin || !this.isConfigured) {
        return null;
      }
      
      if (typeof GoogleSignin.hasPreviousSignIn !== 'function' || typeof GoogleSignin.signInSilently !== 'function') {
        return null;
      }
      
      // First check if user has previous sign-in
      const hasPreviousSignIn = await GoogleSignin.hasPreviousSignIn();
      if (!hasPreviousSignIn) {
        return null;
      }
      
      // Try to get current user info silently
      const userInfo = await GoogleSignin.signInSilently();
      
      // Only return if we have valid data
      if (userInfo && userInfo.type !== 'noSavedCredentialFound' && (userInfo.data || userInfo.user || userInfo.idToken)) {
        return userInfo;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    try {
      if (!GoogleSignin || typeof GoogleSignin.hasPreviousSignIn !== 'function') {
        return false;
      }
      
      return await GoogleSignin.hasPreviousSignIn();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if we can do seamless sign-in (user is already signed in to Google)
   * Note: For logged-out users, we always show email selection first
   */
  async canDoSeamlessSignIn(): Promise<boolean> {
    try {
      if (!GoogleSignin || !this.isConfigured) {
        return false;
      }
      
      if (typeof GoogleSignin.signInSilently !== 'function') {
        return false;
      }
      
      // Only allow seamless sign-in if user is already authenticated in the app
      // For logged-out users, we always show email selection first
      const userInfo = await GoogleSignin.signInSilently();
      return userInfo && userInfo.type !== 'noSavedCredentialFound' && (userInfo.data || userInfo.user || userInfo.idToken);
    } catch (error) {
      return false;
    }
  }

  /**
   * Force complete logout from Google - more aggressive than regular signOut
   */
  private async forceCompleteLogout(): Promise<void> {
    try {
      if (GoogleSignin && this.isConfigured) {
        // Step 1: Check if there's any previous sign-in
        if (typeof GoogleSignin.hasPreviousSignIn === 'function') {
          const hasPreviousSignIn = await GoogleSignin.hasPreviousSignIn();
          
          if (hasPreviousSignIn) {
            // Step 2: Revoke all access tokens
            if (typeof GoogleSignin.revokeAccess === 'function') {
              try {
                await GoogleSignin.revokeAccess();
              } catch (error) {
                // Ignore revoke errors
              }
            }
            
            // Step 3: Sign out from Google
            if (typeof GoogleSignin.signOut === 'function') {
              try {
                await GoogleSignin.signOut();
              } catch (error) {
                // Ignore sign-out errors
              }
            }
            
            // Step 4: Clear any cached tokens
            if (typeof GoogleSignin.clearCachedAccessToken === 'function') {
              try {
                await GoogleSignin.clearCachedAccessToken('');
              } catch (error) {
                // Ignore cache clear errors
              }
            }
            
          }
        }
      }
    } catch (error) {
      // Ignore logout errors
    }
  }

  /**
   * Complete authentication after user consent
   */
  async completeAuthenticationWithConsent(pendingAuth: {
    idToken: string;
    email: string;
    name: string | null;
    photo: string | null;
  }, referralCode?: string): Promise<GoogleAuthResult> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const { idToken, email, name, photo } = pendingAuth;

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        this.logger.error('GoogleAuth', 'Supabase authentication failed', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('No user data returned from Supabase');
      }


      // Ensure user profile exists
      await this.ensureUserProfile(data.user.id, email, name, photo, referralCode, true);

      return {
        success: true,
        user: data.user,
        isNewUser: true
      };
    } catch (error) {
      let errorMessage = 'Failed to complete authentication';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      this.logger.error('GoogleAuth', 'Authentication completion failed:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sign out from Google and Supabase with complete session clearing
   */
  async signOut(): Promise<void> {
    try {
      // Step 1: Force complete Google logout
      await this.forceCompleteLogout();
      
      // Step 2: Clear Supabase session
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      
      // Step 3: Reset internal state and force reconfiguration
      this.isConfigured = false;
      this.configurationPromise = null;
      
      // Step 4: Wait a moment and verify complete logout
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (GoogleSignin && typeof GoogleSignin.hasPreviousSignIn === 'function') {
        const stillHasPrevious = await GoogleSignin.hasPreviousSignIn();
        
        if (stillHasPrevious) {
          // Try one more aggressive cleanup
          try {
            if (typeof GoogleSignin.revokeAccess === 'function') {
              await GoogleSignin.revokeAccess();
            }
            if (typeof GoogleSignin.signOut === 'function') {
              await GoogleSignin.signOut();
            }
          } catch (error) {
            // Ignore final cleanup errors
          }
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up and reset configuration (for debugging)
   */
  async resetConfiguration(): Promise<void> {
    this.isConfigured = false;
    this.configurationPromise = null;
    
    if (GoogleSignin) {
      try {
        await this.signOut();
      } catch (error) {
        // Ignore sign out errors during reset
      }
    }
  }
}

export default GoogleAuthService;