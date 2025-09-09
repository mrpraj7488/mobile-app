import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { DollarSign, Crown, ShieldOff, Star, Bug, Gift, Play, Clock, Coins, Sparkles, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfig } from '@/contexts/ConfigContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/lib/supabase';
import AdService from '../../services/AdService';
import AdFreeService from '@/services/AdFreeService';
import InAppRatingService from '@/services/InAppRatingService';
import * as Haptics from 'expo-haptics';
import { useNetwork } from '../../services/NetworkHandler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function MoreTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { config } = useConfig();
  const { showError, showSuccess, showInfo, showConfirm } = useAlert();
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const [menuVisible, setMenuVisible] = useState(false);
  const [freeCoinsAvailable, setFreeCoinsAvailable] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);

  // Animation values for free coins card
  const shimmerAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    checkFreeCoinsAvailability();
    
    // Update timer every minute
    const interval = setInterval(checkFreeCoinsAvailability, 60000);
    
    // Start animations
    startAnimations();
    
    return () => clearInterval(interval);
  }, []);

  const startAnimations = () => {
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  };

  const checkAdFreeStatus = async () => {
    try {
      const adFreeService = AdFreeService.getInstance();
      const isActive = await adFreeService.checkAdFreeStatus();
      setIsAdFreeActive(isActive);
    } catch (error) {
      setIsAdFreeActive(false);
    }
  };

  const checkFreeCoinsAvailability = async () => {
    try {
      if (user) {
        const supabase = getSupabase();
        const { data: canClaim } = await supabase.rpc('can_claim_free_coins', {
          p_user_id: user.id
        });
        
        setFreeCoinsAvailable(canClaim || false);
        
        // If can't claim, check when they can claim again and set a timer
        if (!canClaim) {
          const { data: lastSession } = await supabase
            .from('user_ad_sessions')
            .select('start_time')
            .eq('user_id', user.id)
            .eq('session_type', 'free_coins')
            .order('start_time', { ascending: false })
            .limit(1)
            .single();
            
          if (lastSession) {
            const lastClaimTime = new Date(lastSession.start_time).getTime();
            const twoHoursInMs = 2 * 60 * 60 * 1000;
            const timeDiff = Date.now() - lastClaimTime;
            const remainingTime = twoHoursInMs - timeDiff;
            
            if (remainingTime > 0) {
              const hours = Math.floor(remainingTime / (60 * 60 * 1000));
              const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
              setTimeRemaining(`${hours}h ${minutes}m`);
              
              setTimeout(() => {
                setFreeCoinsAvailable(true);
                setTimeRemaining('');
              }, remainingTime);
            }
          }
        } else {
          setTimeRemaining('');
        }
      } else {
        setFreeCoinsAvailable(true);
        setTimeRemaining('');
      }
    } catch (error) {
      setFreeCoinsAvailable(true);
      setTimeRemaining('');
    }
  };

  const handleFreeCoinsClick = async () => {
    if (!freeCoinsAvailable || loading) return;

    // Check cooldown first
    if (user) {
      try {
        const supabase = getSupabase();
        const { data: canClaim } = await supabase.rpc('can_claim_free_coins', {
          p_user_id: user.id
        });
        
        if (!canClaim) {
          showInfo('Cooldown Active', 'You can claim free coins again in 2 hours. Please wait before trying again.');
          return;
        }
      } catch (error) {
        // Continue if cooldown check fails
      }
    }

    // Ad-free sessions do not affect free coin rewards

    // Check if ads are enabled in runtime config
    if (!config?.features.adsEnabled) {
      showInfo('Feature Unavailable', 'Free coins through ads are currently disabled.');
      return;
    }

    // Check for ad blocking before showing ad
    const adService = AdService.getInstance();
    const adBlockStatus = adService.getAdBlockStatus();
    
    if (adBlockStatus.detected) {
      showConfirm(
        'Ad Blocker Detected',
        'Please disable ad blocking software to earn free coins through ads. Reset detection and try again?',
        () => {
          adService.resetAdBlockDetection();
          // Retry the ad after a short delay
          setTimeout(() => handleFreeCoinsClick(), 1000);
        }
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Animate coin bounce
    coinBounce.value = withSequence(
      withSpring(1.2, { damping: 15, stiffness: 400 }),
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    // Show confirmation and handle the ad flow
    showConfirm(
      '🎬 Watch Ad for Free Coins',
      'Watch a 30-second ad to earn 100 free coins. Continue?',
      () => {
        // Start loading after confirmation
        setLoading(true);
        handleAdReward();
      },
      () => {
        // User cancelled
        setLoading(false);
      }
    );
  };

  const handleAdReward = async () => {
    try {
      // Ensure user ID is available in AsyncStorage for reward validation
      if (user?.id) {
        await AsyncStorage.setItem('user_id', user.id);
      }
      
      // Use AdService to show rewarded ad - force ad to show even during ad-free sessions
      const adService = AdService.getInstance();
      await adService.showRewardedAd(async (reward: { amount: number; type: string }) => {
        try {
          // Only award coins if user actually watched an ad (not ad-free reward)
          if (user && reward.type !== 'ad_free') {
            const coinAmount = 100; // Always award 100 coins for free coin ads
            const supabase = getSupabase();
            
            // Update user's coin balance first
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                coins: (profile?.coins || 0) + coinAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (!updateError) {
              // Insert transaction record
              const { error } = await supabase
                .from('transactions')
                .insert({
                  transaction_id: `ad_${Date.now()}_${user.id.substring(0, 8)}`,
                  user_id: user.id,
                  amount: coinAmount,
                  transaction_type: 'ad_reward',
                  description: 'Free coins earned by watching 30-second ad',
                  metadata: {
                    ad_duration: 30,
                    platform: Platform.OS,
                    reward_type: reward.type,
                    admob_amount: reward.amount
                  }
                });

              // Log free coin reward in database
              try {
                await supabase.rpc('log_free_coin_reward', {
                  p_user_id: user.id,
                  p_coins_earned: coinAmount
                });
              } catch (logError) {
                // Logging failed but reward was given
              }

              // Update local profile state
              await refreshProfile();

              // Disable free coins button for 2 hours and update timer
              setFreeCoinsAvailable(false);
              setTimeRemaining('2h 0m');
              
              // Set timer to re-enable after 2 hours
              setTimeout(() => {
                setFreeCoinsAvailable(true);
                setTimeRemaining('');
              }, 2 * 60 * 60 * 1000); // 2 hours in milliseconds

              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              showSuccess(
                '🎉 Coins Earned!',
                `${coinAmount} coins have been added to your account! Come back in 2 hours for more free coins.`
              );
            } else {
              throw new Error('Failed to update coin balance');
            }
          } else if (reward.type === 'ad_free') {
            // User has ad-free session, no coins awarded
            showInfo(
              '🛡️ Ad Required for Coins',
              'Free coins require watching ads. This feature works independently of ad-free sessions.'
            );
          }
        } catch (error) {
          // Check for network errors and show appropriate alert
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
            showNetworkAlert();
          } else {
            showError('Error', 'Failed to award coins. Please try again.');
          }
        }
      }, true, 'coins'); // Force show ad even during ad-free sessions, specify coin reward
    } catch (error) {
      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        
        showNetworkAlert();
      } else {
        showError('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: DollarSign, title: 'Buy Coins', subtitle: 'Unlock Rewards', route: '/buy-coins' },
    { icon: Crown, title: 'Become VIP', subtitle: 'Premium Access', route: '/become-vip' },
    { icon: ShieldOff, title: 'Stop Ads', subtitle: '5 Hours Ad-Free', route: '/configure-ads' },
    { icon: Star, title: 'Rate VidGro', subtitle: 'Earn 100 Coins', action: 'rate' },
    { icon: Bug, title: 'Report Problem', subtitle: 'Technical Issues', route: '/report-problem' },
  ];

  const handleRateApp = async () => {
    if (!user) {
      showError('Sign In Required', 'Please sign in to rate the app and earn coins.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);

    try {
      const ratingService = InAppRatingService.getInstance();
      const result = await ratingService.requestReview(user.id);

      if (result.success) {
        if (result.rewarded && result.coinsEarned) {
          // Refresh profile to show updated coin balance
          await refreshProfile();
          
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          showSuccess(
            '🎉 Thank You!',
            `${result.message}\n\nYour new coin balance will be updated shortly.`
          );
        } else {
          showInfo('Thank You!', result.message);
        }
      } else {
        showInfo('Rating Status', result.message);
      }
    } catch (error) {
      showError(
        'Rating Failed',
        'Unable to open rating dialog. Please try rating VidGro directly in the app store.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: any) => {
    if (item.action === 'rate') {
      handleRateApp();
    } else if (item.route) {
      router.push(item.route);
    }
  };

// Animated styles
const shimmerAnimatedStyle = useAnimatedStyle(() => {
  const translateX = interpolate(
    shimmerAnimation.value,
    [0, 1],
    [-screenWidth, screenWidth]
  );
  return {
    transform: [{ translateX }],
  };
});

const pulseAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulseAnimation.value }],
}));

const sparkleAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${sparkleRotation.value}deg` }],
}));

const coinBounceStyle = useAnimatedStyle(() => ({
  transform: [{ scale: coinBounce.value }],
}));

const glowAnimatedStyle = useAnimatedStyle(() => ({
  opacity: glowOpacity.value,
}));

return (
  <View style={[styles.container, { backgroundColor: colors.background }]}>
    <GlobalHeader 
      title="More" 
      showCoinDisplay={true}
      menuVisible={menuVisible} 
      setMenuVisible={setMenuVisible} 
    />
    
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
    >
      {/* Enhanced Free Coins Section */}
      <View style={[styles.freeCoinsSection, isTablet && styles.freeCoinsSectionTablet]}>
        <Text style={[
          styles.freeCoinsSectionTitle, 
          { 
            color: colors.text,
            fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,        
          }
        ]}>
          🎁 Free Coins Available
        </Text>
        
        <AnimatedTouchableOpacity
          style={[
            styles.freeCoinsCard,
            { 
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
              borderColor: freeCoinsAvailable ? colors.success : colors.border,
              opacity: freeCoinsAvailable ? 1 : 0.8
            },
            !freeCoinsAvailable && styles.freeCoinsCardDisabled,
            isTablet && styles.freeCoinsCardTablet,
            pulseAnimatedStyle
          ]}
          onPress={handleFreeCoinsClick}
          disabled={!freeCoinsAvailable || loading}
          activeOpacity={0.9}
        >
          {/* Shimmer effect for available state */}
          {freeCoinsAvailable && (
            <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255, 215, 0, 0.4)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}

          {/* Glow effect */}
          {freeCoinsAvailable && (
            <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />
          )}

          <LinearGradient
            colors={
              freeCoinsAvailable
                ? isDark 
                  ? ['rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.1)', 'rgba(255, 215, 0, 0.15)']
                  : ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)', 'rgba(255, 215, 0, 0.2)']
                : isDark
                  ? ['rgba(107, 114, 128, 0.15)', 'rgba(107, 114, 128, 0.05)']
                  : ['rgba(156, 163, 175, 0.15)', 'rgba(156, 163, 175, 0.05)']
            }
            style={styles.freeCoinsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Horizontal Layout for Small Screens */}
            <View style={styles.freeCoinsHorizontalLayout}>
              {/* Left Section - Icon and Status */}
              <View style={styles.freeCoinsLeftSection}>
                <View style={[
                  styles.freeCoinsIcon,
                  { 
                    backgroundColor: freeCoinsAvailable 
                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)')
                      : (isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(156, 163, 175, 0.2)')
                  }
                ]}>
                  {freeCoinsAvailable ? (
                    <View style={styles.iconContainer}>
                      <Gift size={isSmallScreen ? 20 : 24} color={colors.success} />
                      <Animated.View style={[styles.sparkleIcon, sparkleAnimatedStyle]}>
                        <Sparkles size={isSmallScreen ? 8 : 10} color="#FFD700" />
                      </Animated.View>
                    </View>
                  ) : (
                    <Clock size={isSmallScreen ? 20 : 24} color={colors.textSecondary} />
                  )}
                </View>
              </View>

                 {/* Center Section - Content */}
                 <View style={styles.freeCoinsCenterSection}>
                  <Text style={[
                    styles.freeCoinsTitle,
                    { 
                      color: freeCoinsAvailable ? colors.text : colors.textSecondary,
                      fontSize: isSmallScreen ? 14 : 16
                    }
                  ]}>
                    {freeCoinsAvailable ? '🎬 Watch & Earn' : '⏰ Cooldown'}
                  </Text>
                  {freeCoinsAvailable && (
                    <Text style={[
                      styles.freeCoinsSubtitle,
                      { 
                        color: colors.textSecondary,
                        fontSize: isSmallScreen ? 11 : 12
                      }
                    ]}>
                      30s ad = 100 coins
                    </Text>
                  )}
                </View>
{/* Right Section - Coin Badge */}
<Animated.View style={[styles.freeCoinsRightSection, coinBounceStyle]}>
                  <View style={[
                    styles.coinsBadge,
                    { 
                      backgroundColor: freeCoinsAvailable 
                        ? (isDark ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 215, 0, 0.2)')
                        : (isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(156, 163, 175, 0.15)')
                    }
                  ]}>
                    <Coins size={isSmallScreen ? 12 : 14} color={freeCoinsAvailable ? '#FFD700' : colors.textSecondary} />
                    <Text style={[
                      styles.coinsAmount,
                      { 
                        color: freeCoinsAvailable ? '#FFD700' : colors.textSecondary,
                        fontSize: isSmallScreen ? 14 : 16
                      }
                    ]}>
                      100
                    </Text>
                  </View>
                </Animated.View>
              </View>

              {freeCoinsAvailable && (
                <View style={styles.freeCoinsAction}>
                  <View style={[styles.adPreview, { backgroundColor: colors.primary + '20' }]}>
                    <Play size={isSmallScreen ? 14 : 16} color={colors.primary} />
                    <Text style={[
                      styles.adPreviewText,
                      { 
                        color: colors.primary,
                        fontSize: isSmallScreen ? 12 : 14
                      }
                    ]}>
                      {loading ? 'Loading Ad...' : 'Tap to watch 30s ad'}
                    </Text>
                    <Zap size={isSmallScreen ? 12 : 14} color={colors.primary} />
                  </View>
                </View>
              )}

              {!freeCoinsAvailable && timeRemaining && (
                <View style={styles.cooldownInfo}>
                  <View style={[styles.cooldownBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Clock size={isSmallScreen ? 14 : 16} color={colors.warning} />
                    <Text style={[
                      styles.cooldownText,
                      { 
                        color: colors.warning,
                        fontSize: isSmallScreen ? 12 : 14
                      }
                    ]}>
                      Next free coins in {timeRemaining}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </AnimatedTouchableOpacity>
        </View>

         {/* Main Menu Grid */}
        <View style={[styles.menuGrid, isTablet && styles.menuGridTablet]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { 
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  borderColor: colors.border
                },
                isTablet && styles.menuItemTablet
              ]}
              onPress={() => handleItemPress(item)}
              disabled={item.action === 'rate' && loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(74, 144, 226, 0.15)', 'rgba(74, 144, 226, 0.05)']
                  : ['rgba(128, 0, 128, 0.15)', 'rgba(128, 0, 128, 0.05)']
                }
                style={styles.menuItemGradient}
              >
                <View style={[
                  styles.menuItemIcon, 
                  { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 0, 128, 0.2)' }
                ]}>
                  <item.icon size={isSmallScreen ? 20 : 24} color={colors.accent} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[
                    styles.menuItemTitle, 
                    { 
                      color: colors.text,
                      fontSize: isSmallScreen ? 16 : 18
                    }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.menuItemSubtitle, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isSmallScreen ? 12 : 14
                    }
                  ]}>
                    {item.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 20 : 24,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    paddingBottom: 60,
  },

  // Enhanced Free Coins Section
  freeCoinsSection: {
    marginBottom: isSmallScreen ? 32 : 40,
  },
  freeCoinsSectionTablet: {
    marginBottom: 48,
  },
  freeCoinsSectionTitle: {
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 16 : 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  freeCoinsCard: {
    borderRadius: isSmallScreen ? 20 : 24,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  freeCoinsCardTablet: {
    alignSelf: 'center',
    maxWidth: 500,
  },
  freeCoinsCardDisabled: {
    shadowOpacity: 0.1,
    elevation: 4,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: screenWidth,
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: isSmallScreen ? 24 : 28,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    zIndex: 0,
  },
  freeCoinsGradient: {
    padding: isSmallScreen ? 16 : 20,
    zIndex: 2,
  },
  freeCoinsHorizontalLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 8 : 12,
  },
  freeCoinsLeftSection: {
    flexShrink: 0,
  },
  freeCoinsCenterSection: {
    flex: 1,
    justifyContent: 'center',
  },
  freeCoinsRightSection: {
    flexShrink: 0,
    alignItems: 'center',
  },
  freeCoinsIcon: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleIcon: {
    position: 'absolute',
    top: isSmallScreen ? -4 : -6,
    right: isSmallScreen ? -4 : -6,
  },
  freeCoinsTitle: {
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 2 : 4,
    letterSpacing: 0.5,
  },
  freeCoinsSubtitle: {
    lineHeight: isSmallScreen ? 14 : 16,
    fontWeight: '500',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 4 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  coinsAmount: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  freeCoinsAction: {
    alignItems: 'center',
  },
  adPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: isSmallScreen ? 12 : 14,
    gap: isSmallScreen ? 8 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adPreviewText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cooldownInfo: {
    alignItems: 'center',
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: isSmallScreen ? 12 : 14,
    gap: isSmallScreen ? 8 : 10,
  },
  cooldownText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Main Menu Grid
  menuGrid: {
    gap: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 24 : 32,
  },
  menuGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  menuItem: {
    borderRadius: isSmallScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItemTablet: {
    width: (screenWidth - 120) / 2,
  },
  menuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 20 : 24,
  },
  menuItemIcon: {
    width: isSmallScreen ? 48 : 52,
    height: isSmallScreen ? 48 : 52,
    borderRadius: isSmallScreen ? 24 : 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 16 : 20,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  menuItemSubtitle: {
    lineHeight: 20,
    fontWeight: '500',
  },
});