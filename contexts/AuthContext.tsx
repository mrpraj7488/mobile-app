import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, getSupabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useConfig } from './ConfigContext';

interface Profile {
  id: string;
  email: string;
  username: string;
  coins: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  referral_code: string;
  referred_by: string | null;
  referral_coins_earned: number;
  total_referrals: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, referralCode?: string | null) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { config, loading: configLoading, isConfigValid } = useConfig();

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const initializeAuth = async () => {
      // Wait for ConfigContext to be ready and Supabase to be initialized
      if (configLoading || !isConfigValid || !config) {
        setLoading(true); // Keep loading while waiting for config
        return;
      }

      // Wait for Supabase to be initialized
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        setLoading(true); // Keep loading while waiting for Supabase
        
        // Retry after a short delay
        retryTimeout = setTimeout(() => {
          initializeAuth();
        }, 500);
        return;
      }

      try {
        // Get initial session
        const { data: { session } } = await supabaseClient.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event: any, session: any) => {
            setUser(session?.user ?? null);
            if (session?.user) {
              await loadProfile(session.user.id);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.warn('Auth initialization failed:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [configLoading, isConfigValid, config]); // Add dependencies to re-run when config is ready

  const loadProfile = async (userId: string) => {
    try {
      const profileData = await getUserProfile(userId);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        return { error: new Error('Supabase not initialized') };
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      // If login successful, the onAuthStateChange listener will handle setting the user state
      // But we can also set it immediately for better responsiveness
      if (data?.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
      }
      
      return { error: null };
    } catch (error) {
      console.error('SignIn error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string, referralCode?: string | null) => {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return { error: new Error('Supabase not initialized') };
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          username,
          referral_code: referralCode,
        },
      },
    });
    
    // If signup successful, ensure profile is created
    if (data?.user && !error) {
      try {
        // Wait a moment for the trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created, if not create it manually
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();
        
        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it manually
          console.log('Profile not found, creating manually...');
          console.log('Referral code being passed:', referralCode);
          
          const { data: createResult, error: createError } = await supabaseClient
            .rpc('create_missing_profile', {
              p_user_id: data.user.id,
              p_email: email,
              p_username: username,
              p_referral_code: referralCode
            });
          
          if (createError) {
            console.error('Failed to create profile manually:', createError);
            return { error: createError };
          } else {
            console.log('Profile created manually:', createResult);
          }
        }
        
        // Wait for profile to be fully created before continuing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Manually fetch and set the profile to ensure it's loaded
        let profileAttempts = 0;
        const maxAttempts = 5;
        
        while (profileAttempts < maxAttempts) {
          try {
            const { data: newProfile, error: profileFetchError } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            
            if (!profileFetchError && newProfile) {
              setProfile(newProfile);
              console.log('Profile loaded successfully:', newProfile);
              break;
            }
            
            profileAttempts++;
            if (profileAttempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (fetchError) {
            console.error('Error fetching profile:', fetchError);
            profileAttempts++;
            if (profileAttempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (profileAttempts >= maxAttempts) {
          console.error('Failed to load profile after multiple attempts');
          return { error: new Error('Failed to load profile') };
        }
        
      } catch (profileCreationError) {
        console.error('Error ensuring profile creation:', profileCreationError);
        return { error: profileCreationError };
      }
    }
    
    // If signup successful but no session, try to sign in immediately
    if (data?.user && !data?.session && !error) {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error: signInError };
    }
    
    return { error };
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    
    try {
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error('SignOut error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}