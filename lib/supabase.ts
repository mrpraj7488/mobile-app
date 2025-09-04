import { createClient, SupabaseClient } from '@supabase/supabase-js';
import SecurityService from '../services/SecurityService';
import CacheOptimizer from '../utils/CacheOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from '../contexts/ConfigContext';

// Type definitions
export interface RuntimeConfig {
  supabase: {
    url: string;
    anonKey?: string;
  };
  admob: {
    appId?: string;
    bannerId?: string;
    interstitialId?: string;
    rewardedId?: string;
  };
  features: {
    coinsEnabled: boolean;
    adsEnabled: boolean;
    vipEnabled: boolean;
    referralsEnabled: boolean;
    analyticsEnabled: boolean;
  };
  app: {
    minVersion: string;
    forceUpdate: boolean;
    maintenanceMode: boolean;
    apiVersion: string;
  };
  security: {
    allowEmulators: boolean;
    allowRooted: boolean;
    requireSignatureValidation: boolean;
    adBlockDetection: boolean;
  };
  metadata: {
    configVersion: string;
    lastUpdated: string;
    ttl: number;
  };
}

// Dynamic Supabase client that will be initialized with runtime config

let supabaseClient: any = null;
let runtimeConfig: RuntimeConfig | null = null;
let configFetchPromise: Promise<RuntimeConfig | null> | null = null;
let isInitializing = false;

// Keep track of initialization attempts
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Helper: Initialize Supabase with config if possible
const tryInitializeWithConfig = (config: RuntimeConfig | null): boolean => {
  if (!config?.supabase?.url) {
    return false;
  }

  // For public endpoint, use fallback key if anonKey is missing
  const anonKey = config.supabase.anonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  // If no anonKey available, skip Supabase initialization
  // The app will work in limited mode without auth features
  if (!anonKey) {
    return true; // Return true to allow config validation to pass
  }

  const client = initializeSupabase(config.supabase.url, anonKey);
  return !!client;
};


export const initializeSupabase = (url: string, anonKey: string | null | undefined) => {
  if (supabaseClient) {
    return supabaseClient;
  }
  if (!url || !anonKey) {
    return null;
  }
  
  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
  return supabaseClient;
};

export const getSupabase = () => {
  return supabaseClient;
};

// For backward compatibility, export as supabase
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabase();
    if (!client) {
      // Return a safe no-op function for production
      return () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') });
    }
    return client[prop];
  }
});

// Lazy initialization to prevent circular dependencies
let initializationPromise: Promise<void> | null = null;

export const ensureSupabaseInitialized = async (): Promise<void> => {
  if (supabaseClient) return;
  
  if (isInitializing) {
    // Wait for current initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return;
  }
  
  if (!initializationPromise) {
    isInitializing = true;
    initializationPromise = (async () => {
      try {
        const config = await fetchRuntimeConfig();
        if (config?.supabase?.url && config?.supabase?.anonKey) {
          initializeSupabase(config.supabase.url, config.supabase.anonKey);
        }
      } catch (error) {
        // Silent fail for initialization
      } finally {
        isInitializing = false;
      }
    })();
  }
  
  await initializationPromise;
};

// Remove old awardCoinsForVideo function and replace with new watchVideo
export const watchVideoAndEarnCoins = async (
  userId: string,
  videoId: string,
  watchDuration: number,
  fullyWatched: boolean = false
): Promise<{ data: any; error: any }> => {
  try {
    await ensureSupabaseInitialized();
    const client = getSupabase();
    if (!client) {
      return { data: null, error: new Error('Supabase not available') };
    }
    
    const { data, error } = await client.rpc('watch_video_and_earn_coins', {
      user_uuid: userId,
      video_uuid: videoId,
      watch_duration: watchDuration,
      video_fully_watched: fullyWatched,
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Get user profile
export async function getUserProfile(userId: string): Promise<any> {
  if (!userId) {
    return null;
  }

  try {
    const supabaseClient = getSupabase();
    
    if (!supabaseClient) {
      return null;
    }
    
    // Check current session context
    const { data: sessionData } = await supabaseClient.auth.getSession();
    
    // Try direct RPC call to verify profile exists (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_profile_by_id', { 
      profile_id: userId 
    });
    
    // If session is lost but profile exists, use RPC result
    if (!sessionData?.session?.user?.id && rpcData && rpcData.length > 0) {
      return rpcData[0];
    }
    
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

// Get video queue
export async function getVideoQueue(userId: string): Promise<any[]> {
  try {
    await ensureSupabaseInitialized();
    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase not initialized');
    }
    
    const { data, error } = await client
      .from('videos')
      .select('*')
      .neq('user_id', userId)  // Don't show user's own videos
      .is('deleted_at', null)  // Only show non-deleted videos
      .in('status', ['active', 'repromoted'])  // Both active and repromoted videos are playable
      .or('hold_until.is.null,hold_until.lte.now()')  // Either no hold or hold has expired
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return data?.map((video: any) => ({
      ...video,
      youtube_url: video.youtube_url,
      coin_reward: video.coin_reward || 1,
      duration: video.duration || 30,
      // Ensure these fields exist to prevent undefined errors
      views_count: video.views_count || 0,
      target_views: video.target_views || 0,
      completed: video.completed || false
    })) || [];
  } catch (error) {
    return [];
  }
};

// Create video promotion
export const createVideoPromotion = async (
  coinCost: number,
  coinReward: number,
  duration: number,
  targetViews: number,
  title: string,
  userId: string,
  youtubeUrl: string
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().rpc('create_video_promotion', {
    coin_cost_param: coinCost,
    coin_reward_param: coinReward,
    duration_seconds_param: duration,
    target_views_param: targetViews,
    title_param: title,
    user_uuid: userId,
    youtube_url_param: youtubeUrl
  });
  
  // Record promotion transaction if successful
  if (!error && data?.success) {
    try {
      const supabase = getSupabase();
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: `promotion_${userId}_${Date.now()}`,
          user_id: userId,
          transaction_type: 'video_promotion',
          amount: -coinCost,
          description: `Video promotion: ${title}`,
          metadata: {
            video_title: title,
            target_views: targetViews,
            duration: duration,
            coin_reward: coinReward
          }
        });
    } catch (transactionError) {
      // Silent fail - don't break promotion flow
    }
  }
  
  return { data, error };
};

// Repromote video
export const repromoteVideo = async (
  videoId: string,
  userId: string,
  additionalCost: number = 0
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().rpc('repromote_video', {
    video_uuid: videoId,
    user_uuid: userId,
    additional_coin_cost: additionalCost
  });
  return { data, error };
};

// Delete video
export const deleteVideo = async (
  videoId: string,
  userId: string
): Promise<{ data: any; error: any }> => {
  // Use direct table operations for reliable deletion with refund
  const supabase = getSupabase();
  
  // Attempting to delete video with refund
  
  // Get video details for refund calculation - try multiple approaches
  let { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('user_id', userId)
    .single();
  
  // Video lookup result processed
  
  if (videoError || !video) {
    // Try lookup without user_id constraint (in case of permission issues)
    const { data: altVideo, error: altError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    // Alternative video lookup attempted
    
    if (altError || !altVideo) {
      return { data: null, error: { message: 'Video not found in database' } };
    }
    
    // Verify ownership manually
    if (altVideo.user_id !== userId) {
      return { data: null, error: { message: 'Video not owned by user' } };
    }
    
    // Use the alternative video data
    video = altVideo;
  }
  
  // Calculate refund
  const minutesSinceCreation = (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60);
  const refundPercentage = minutesSinceCreation <= 10 ? 100 : 50;
  const refundAmount = Math.round((video.coin_cost * refundPercentage) / 100);
  
  // Delete video
  const { error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('user_id', userId);
  
  if (deleteError) {
    return { data: null, error: deleteError };
  }
  
  // Get current user balance first
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single();
  
  if (profileError || !profile) {
    return { data: null, error: { message: 'Could not fetch user profile' } };
  }
  
  // Update user balance
  const newBalance = (profile.coins || 0) + refundAmount;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      coins: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (updateError) {
    return { data: null, error: updateError };
  }
  
  // Record refund transaction for recent activity
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_type: 'refund',
      amount: refundAmount,
      description: `Video deletion refund (${refundPercentage}%): ${video.title}`,
      created_at: new Date().toISOString()
    });
  
  if (transactionError) {
    console.error('Failed to record refund transaction:', transactionError);
    // Don't fail the whole operation for transaction logging
  }
  
  return { 
    data: {
      success: true,
      refund_amount: refundAmount,
      refund_percentage: refundPercentage,
      message: `Video deleted successfully with ${refundPercentage}% refund`
    }, 
    error: null 
  };
};

// Get user comprehensive analytics
export const getUserComprehensiveAnalytics = async (userId: string) => {
  try {
    // First try to get analytics from the RPC function
    const { data: analyticsData, error: analyticsError } = await getSupabase()
      .rpc('get_user_analytics', { p_user_id: userId });

    if (!analyticsError && analyticsData) {
      return analyticsData;
    }

    // Fallback: Calculate analytics from videos table
    const { data: videos, error: videosError } = await getSupabase()
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (videosError) throw videosError;

    const analytics = {
      total_videos_promoted: videos?.length || 0,
      active_videos: videos?.filter((v: any) => v.status === 'active').length || 0,  
      completed_videos: videos?.filter((v: any) => v.status === 'completed').length || 0,
      on_hold_videos: videos?.filter((v: any) => v.status === 'on_hold').length || 0,
      repromoted_videos: videos?.filter((v: any) => v.status === 'repromoted').length || 0,  
      total_views_received: videos?.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0) || 0,
      total_watch_time: videos?.reduce((sum: number, v: any) => sum + (v.total_watch_time || 0), 0) || 0,
      total_coins_spent: videos?.reduce((sum: number, v: any) => sum + (v.coin_cost || 0), 0) || 0,
      total_coins_earned: videos?.reduce((sum: number, v: any) => sum + (v.coins_earned_total || 0), 0) || 0,
      average_completion_rate: videos?.length > 0 
        ? videos.reduce((sum: number, v: any) => sum + (v.completion_rate || 0), 0) / videos.length 
        : 0
    };

    return analytics;
  } catch (error) {
    return null;
  }
};

// Get user videos with analytics
export const getUserVideosWithAnalytics = async (userId: string) => {
  try {
    // First try to get analytics from the RPC function
    const { data: analyticsData, error: analyticsError } = await getSupabase()
      .rpc('get_user_videos_with_analytics', { p_user_id: userId });

    if (!analyticsError && analyticsData) {
      return analyticsData;
    }

    // Fallback: fetch videos directly from videos table
    const { data: videos, error: videosError } = await getSupabase()
      .from('videos')
      .select(`
        id as video_id,
        title,
        views_count,
        target_views,
        status,
        created_at,
        coin_cost,
        completion_rate,
        completed,
        total_watch_time,
        coins_earned_total
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (videosError) throw videosError;

    return videos || [];
  } catch (err) {
    return null;
  }
};

export const getUserRecentActivity = async (userId: string) => {
  try {
    // Fetch all relevant transactions
    const { data: transactions, error } = await getSupabase()
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .in('transaction_type', [
        'video_promotion',
        'coin_purchase',
        'referral_reward',
        'daily_bonus',
        'adjustment',
        'video_repromoted'  // Added video_repromoted to the list of transaction types
      ])
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    // Map transaction types to activity types
    const activityMap: Record<string, string> = {
      'video_promotion': 'promotion',
      'video_repromoted': 'repromote',
      'coin_purchase': 'purchase',
      'referral_reward': 'referral',
      'daily_bonus': 'bonus',
      'adjustment': 'adjustment'
    };

    // Transform transactions into activity format
    const activities = (transactions || []).map((transaction: any) => ({
      id: transaction.id,
      user_id: transaction.user_id,
      activity_type: activityMap[transaction.transaction_type] || 'other',
      amount: Math.abs(transaction.amount),
      description: transaction.description,
      created_at: transaction.created_at,
      metadata: transaction.metadata || {},
      transaction_type: transaction.transaction_type,
      transaction_id: transaction.transaction_id
    }));

    return { data: activities, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Record coin purchase transaction
export const recordCoinPurchase = async (
  userId: string,
  packageId: string,
  coinsAmount: number,
  bonusCoins: number,
  pricePaid: number,
  transactionId: string,
  platform: string = 'unknown'
) => {
  try {
    const { data, error } = await getSupabase().rpc('record_coin_purchase', {
      user_uuid: userId,
      package_id: packageId,
      coins_amount: coinsAmount,
      bonus_coins: bonusCoins,
      price_paid: pricePaid,
      transaction_id: transactionId,
      purchase_platform: platform
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Get user transaction history
export const getUserTransactionHistory = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await getSupabase()
      .from('coin_transactions')
      .select(`
        id,
        amount,
        transaction_type,
        description,
        reference_id,
        metadata,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Validate runtime configuration structure
export const validateRuntimeConfig = (config: any): RuntimeConfig | null => {
  try {
    // Check if config has required structure
    if (!config || typeof config !== 'object') {
      return null;
    }

    // Check for required top-level fields
    const requiredFields = ['supabase', 'admob', 'features', 'app', 'security', 'metadata'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      return null;
    }

    // Validate basic structure first
    const hasAllRequiredFields = requiredFields.every(field => {
      const hasField = field in config;
      if (!hasField) {
        return false;
      }
      return hasField;
    });

    if (!hasAllRequiredFields) {
      return null;
    }

    // Check if Supabase URL exists
    if (!config.supabase?.url) {
      return null;
    }

    // Create validated config with all fields
    const validatedConfig = {
      supabase: {
        url: config.supabase.url,
        anonKey: config.supabase.anonKey || undefined
      },
      admob: config.admob || {},
      features: config.features || {},
      app: config.app || {},
      security: config.security || {},
      metadata: config.metadata || {}
    };

    // Try to initialize Supabase with the validated config
    if (!supabaseClient && initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      initializationAttempts++;
      const initialized = tryInitializeWithConfig(validatedConfig);
      if (initialized) {
        return validatedConfig;
      } else {
        // For public endpoint, allow config without anonKey (will use fallback)
        return validatedConfig;
      }
    }

    return validatedConfig;
  } catch (error) {
    return null;
  }
};

// Cached runtime config fetching with singleton pattern
export const fetchRuntimeConfig = async (): Promise<RuntimeConfig | null> => {
  const cacheOptimizer = CacheOptimizer.getInstance();
  
  // Check cache first
  const cachedConfig = await cacheOptimizer.getCache<RuntimeConfig>('runtime_config');
  if (cachedConfig) {
    // If public config is disabled and cached config lacks anonKey, force refresh
    const allowPublicConfig = process.env.EXPO_PUBLIC_ALLOW_PUBLIC_CONFIG === 'true';
    if (!allowPublicConfig && !cachedConfig.supabase?.anonKey) {
      await cacheOptimizer.clearAllCache();
    } else {
      return cachedConfig;
    }
  }

  // Return cached config if available and not expired
  if (runtimeConfig && (runtimeConfig as any).metadata) {
    const metadata = (runtimeConfig as any).metadata;
    const lastUpdated = new Date(metadata.lastUpdated).getTime();
    const ttl = metadata.ttl * 1000; // Convert to milliseconds
    const isExpired = Date.now() - lastUpdated > ttl;
    
    if (!isExpired) {
      return runtimeConfig;
    }
  }

  // If already fetching, return the existing promise
  if (configFetchPromise) {
    return configFetchPromise;
  }

  // Create new fetch promise
  const fetchConfigFromServerInternal = async (): Promise<RuntimeConfig | null> => {
    try {
      const securityService = SecurityService.getInstance();
      const deviceId = await securityService.generateDeviceFingerprint();
      const clientId = process.env.EXPO_PUBLIC_ADMIN_CLIENT_ID || 'vidgro_mobile_2024';
      const clientSecret = process.env.EXPO_PUBLIC_ADMIN_CLIENT_SECRET || 'vidgro_secret_key_2024';

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/client-runtime-config/secure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          deviceId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Validate the config structure
      const validatedConfig = validateRuntimeConfig(result.data);
      if (validatedConfig) {
        // Cache the validated config
        await cacheOptimizer.setCache('runtime_config', validatedConfig, 60 * 60 * 1000); // 1 hour TTL
        return validatedConfig;
      }

      throw new Error('Invalid config structure in response data');
    } catch (error) {

      // Fallback to public endpoint for backward compatibility (minimal data)
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/client-runtime-config`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }

        // Validate the public config structure
        const validatedConfig = validateRuntimeConfig(result.data);
        if (validatedConfig) {
          // Cache the validated config
          await cacheOptimizer.setCache('runtime_config', validatedConfig, 30 * 60 * 1000); // 30 min TTL for fallback
          return validatedConfig;
        }

        throw new Error('Invalid config structure in public endpoint response');
      } catch (fallbackError) {
        return null;
      }
    }
  };

  configFetchPromise = fetchConfigFromServerInternal();
  const result = await configFetchPromise;
  configFetchPromise = null; // Reset promise
  return result;
};