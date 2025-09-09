import { getSupabase } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';

interface EmailAuthResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

class EmailAuthService {
  private static instance: EmailAuthService;

  public static getInstance(): EmailAuthService {
    if (!EmailAuthService.instance) {
      EmailAuthService.instance = new EmailAuthService();
    }
    return EmailAuthService.instance;
  }

  // Sign up with email and password
  async signUpWithEmail(
    email: string, 
    password: string, 
    username: string,
    referralCode?: string
  ): Promise<EmailAuthResult> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { success: false, error: 'Authentication service not available' };
      }

      // Validate input
      if (!email || !password || !username) {
        return { success: false, error: 'Email, password, and username are required' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }

      // Check if username is already taken
      const { data: existingUser, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        return { success: false, error: 'Username is already taken' };
      }

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            referral_code: referralCode || null,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Email is already registered. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create account' };
      }

      // Check if email confirmation is required
      if (!data.session) {
        return { 
          success: true, 
          needsVerification: true,
          error: 'Please check your email and click the verification link to complete registration'
        };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create account' 
      };
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { success: false, error: 'Authentication service not available' };
      }

      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            error: 'Please verify your email address before signing in'
          };
        }
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Failed to sign in' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign in' 
      };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<EmailAuthResult> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { success: false, error: 'Authentication service not available' };
      }

      if (!email) {
        return { success: false, error: 'Email is required' };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'vidgro://reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        error: 'Password reset email sent. Please check your inbox.'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reset email' 
      };
    }
  }

  // Resend verification email
  async resendVerification(email: string): Promise<EmailAuthResult> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { success: false, error: 'Authentication service not available' };
      }

      if (!email) {
        return { success: false, error: 'Email is required' };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        error: 'Verification email sent. Please check your inbox.'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resend verification email' 
      };
    }
  }
}

export default EmailAuthService;
