import React, { createContext, useContext, useEffect, useState, startTransition } from 'react';
import { getSupabase, getUserProfile } from '../lib/supabase';
import { useConfig } from './ConfigContext';
import AdFreeService from '../services/AdFreeService';

// Helper function to generate referral code
const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
  last_activity_at: string;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, username: string, referralCode?: string | null) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forceProfileRefresh: (userId?: string) => Promise<void>;
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
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { config, loading: configLoading, isConfigValid } = useConfig();

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const initializeAuth = async (): Promise<any> => {
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
        
        if (session?.user) {
          try {
            const profileData = await getUserProfile(session.user.id);
            if (profileData) {
              startTransition(() => {
                setUser(session.user);
                setProfile(profileData);
                setIsCreatingProfile(false);
              });
              
              // Initialize AdFreeService with user
              const adFreeService = AdFreeService.getInstance();
              adFreeService.setUser(session.user.id);
            } else {
              // Try RLS bypass fallback before forcing logout
              try {
                const { data: fallbackProfile } = await supabaseClient.rpc('get_profile_by_id', {
                  profile_id: session.user.id
                });
                
                if (fallbackProfile && fallbackProfile.length > 0) {
                  startTransition(() => {
                    setUser(session.user);
                    setProfile(fallbackProfile[0]);
                    setIsCreatingProfile(false);
                  });
                  
                  // Initialize AdFreeService with user
                  const adFreeService = AdFreeService.getInstance();
                  adFreeService.setUser(session.user.id);
                } else {
                  // Only force logout if we're not creating a profile AND no fallback found
                  if (!isCreatingProfile) {
                    await forceSignOut('No profile found');
                  } else {
                    startTransition(() => {
                      setUser(session.user);
                    });
                  }
                }
              } catch (fallbackError) {
                if (!isCreatingProfile) {
                  await forceSignOut('Profile loading error');
                } else {
                  startTransition(() => {
                    setUser(session.user);
                  });
                }
              }
            }
          } catch (error) {
            // Try RLS bypass fallback for session timing issues
            try {
              const { data: fallbackProfile } = await supabaseClient.rpc('get_profile_by_id', {
                profile_id: session.user.id
              });
              
              if (fallbackProfile && fallbackProfile.length > 0) {
                startTransition(() => {
                  setUser(session.user);
                  setProfile(fallbackProfile[0]);
                  setIsCreatingProfile(false);
                });
              } else {
                if (!isCreatingProfile) {
                  await forceSignOut('Profile loading error');
                } else {
                  startTransition(() => {
                    setUser(session.user);
                  });
                }
              }
            } catch (fallbackError) {
              if (!isCreatingProfile) {
                await forceSignOut('Profile loading error');
              } else {
                startTransition(() => {
                  setUser(session.user);
                });
              }
            }
          }
        } else {
          startTransition(() => {
            setUser(null);
            setProfile(null);
          });
        }
        startTransition(() => {
          setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event: any, session: any) => {
            if (session?.user) {
              // Validate profile exists before setting user as logged in
              try {
                const profileData = await getUserProfile(session.user.id);
                if (profileData) {
                  // Use startTransition to avoid useInsertionEffect warning
                  startTransition(() => {
                    setUser(session.user);
                    setProfile(profileData);
                  });
                } else {
                  // Try RLS bypass fallback before forcing logout
                  try {
                    const { data: fallbackProfile } = await supabaseClient.rpc('get_profile_by_id', {
                      profile_id: session.user.id
                    });
                    
                    if (fallbackProfile && fallbackProfile.length > 0) {
                      startTransition(() => {
                        setUser(session.user);
                        setProfile(fallbackProfile[0]);
                      });
                    } else {
                      // Only force logout on explicit sign out events, not session refresh
                      if (event === 'SIGNED_OUT') {
                        startTransition(() => {
                          setUser(null);
                          setProfile(null);
                        });
                      } else {
                        // Keep user logged in, profile might be loading
                        startTransition(() => {
                          setUser(session.user);
                        });
                      }
                    }
                  } catch (fallbackError) {
                    // Only force logout on explicit sign out events
                    if (event === 'SIGNED_OUT') {
                      startTransition(() => {
                        setUser(null);
                        setProfile(null);
                      });
                    } else {
                      // Keep user logged in during profile loading issues
                      startTransition(() => {
                        setUser(session.user);
                      });
                    }
                  }
                }
              } catch (error) {
                // Try RLS bypass fallback for session timing issues
                try {
                  const { data: fallbackProfile } = await supabaseClient.rpc('get_profile_by_id', {
                    profile_id: session.user.id
                  });
                  
                  if (fallbackProfile && fallbackProfile.length > 0) {
                    startTransition(() => {
                      setUser(session.user);
                      setProfile(fallbackProfile[0]);
                    });
                  } else {
                    // Only force logout on explicit sign out events
                    if (event === 'SIGNED_OUT') {
                      startTransition(() => {
                        setUser(null);
                        setProfile(null);
                      });
                    } else {
                      // Keep user logged in during temporary issues
                      startTransition(() => {
                        setUser(session.user);
                      });
                    }
                  }
                } catch (fallbackError) {
                  // Only force logout on explicit sign out events
                  if (event === 'SIGNED_OUT') {
                    startTransition(() => {
                      setUser(null);
                      setProfile(null);
                    });
                  } else {
                    // Keep user logged in during temporary issues
                    startTransition(() => {
                      setUser(session.user);
                    });
                  }
                }
              }
            } else {
              startTransition(() => {
                setUser(null);
                setProfile(null);
              });
            }
          }
        );

        // Store subscription for cleanup
        return subscription;
      } catch (error) {
        setLoading(false);
        return null;
      }
    };

    let authSubscription: any = null;
    
    initializeAuth().then((subscription) => {
      authSubscription = subscription;
    });

    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [configLoading, isConfigValid, config]); // Add dependencies to re-run when config is ready

  const loadProfile = async (userId: string) => {
    try {
      const profileData = await getUserProfile(userId);
      if (profileData) {
        setProfile(profileData);
      } else {
        // No profile found - force logout
        await forceSignOut('Profile not found');
      }
    } catch (error) {
      // Profile fetch failed - force logout
      await forceSignOut('Failed to load profile');
    }
  };

  const forceSignOut = async (reason: string) => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setProfile(null);
    } catch (error) {
      // Force clear state even if sign out fails
      setUser(null);
      setProfile(null);
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
          
          const { data: createResult, error: rpcError } = await supabaseClient
            .rpc('create_missing_profile', {
              p_user_id: data.user.id,
              p_email: email,
              p_username: username,
              p_referral_code: referralCode
            });
          
          if (rpcError) {
            throw rpcError;
          }
        }
        
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
              setTimeout(() => {
                setProfile(newProfile);
              }, 0);
              break;
            }
          } catch (fetchError) {
            profileAttempts++;
            if (profileAttempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (profileAttempts >= maxAttempts) {
          return { error: new Error('Failed to load profile') };
        }
        
      } catch (profileCreationError) {
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

  const signOut = async (): Promise<void> => {
    try {
      // Clear AdFreeService user data
      const adFreeService = AdFreeService.getInstance();
      await adFreeService.logout();
      
      // Import GoogleAuthService dynamically to avoid circular imports
      const GoogleAuthService = (await import('@/services/GoogleAuthService')).default;
      const googleAuthService = new GoogleAuthService();
      
      // Clear Google Auth sessions completely
      try {
        await googleAuthService.signOut();
      } catch (googleError) {
      }
      
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      setUser(null);
      setProfile(null);
    } catch (error) {
      // Force clear state even if sign out fails
      setUser(null);
      setProfile(null);
      
      // Still clear AdFreeService on error
      try {
        const adFreeService = AdFreeService.getInstance();
        await adFreeService.logout();
      } catch {}
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const forceProfileRefresh = async (userId?: string) => {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      return;
    }
    
    setIsCreatingProfile(true);
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      targetUserId = session?.user?.id;
    }
    
    if (targetUserId) {
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const profileData = await getUserProfile(targetUserId);
      if (profileData) {
        // Get fresh session to ensure we have the latest user data
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setProfile(profileData);
        } else {
          // If session is lost but we have profile, create a minimal user object
            const minimalUser = {
            id: targetUserId,
            email: profileData.email,
            user_metadata: {},
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setUser(minimalUser);
          setProfile(profileData);
          }
        setIsCreatingProfile(false);
      } else {
        setIsCreatingProfile(false);
      }
    } else {
      setIsCreatingProfile(false);
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
    forceProfileRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}