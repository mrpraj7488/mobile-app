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
import AdService from '@/services/AdService';
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
const isVerySmallScreen = screenWidth < 350;
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
    // Shimmer effect
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse animation
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    // Sparkle rotation
    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );

    // Glow effect
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  };

  const checkFreeCoinsAvailability = async () => {
    try {
      const lastClaimTime = await AsyncStorage.getItem('lastFreeCoinsClaimTime');
      if (lastClaimTime) {
        const lastClaim = new Date(lastClaimTime);
        const now = new Date();
        const timeDiff = now.getTime() - lastClaim.getTime();
        const twoHoursInMs = 2 * 60 * 60 * 1000;
        
        if (timeDiff < twoHoursInMs) {
          setFreeCoinsAvailable(false);
          const remainingMs = twoHoursInMs - timeDiff;
          const hours = Math.floor(remainingMs / (60 * 60 * 1000));
          const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setFreeCoinsAvailable(true);
          setTimeRemaining('');
        }
      } else {
        setFreeCoinsAvailable(true);
        setTimeRemaining('');
      }
    } catch (error) {
      console.error('Error checking free coins availability:', error);
      setFreeCoinsAvailable(true);
    }
  };

  const handleFreeCoinsClick = async () => {
    if (!freeCoinsAvailable || loading) return;

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
      // Use AdService to show rewarded ad
      const adService = AdService.getInstance();
      const adResult = await adService.showRewardedAd();
      
      if (adResult.success) {
        try {
          // Award coins to user
          if (user) {
            const supabase = getSupabase();
            const { error } = await supabase
              .from('coin_transactions')
              .insert({
                user_id: user.id,
                amount: adResult.reward || 100,
                transaction_type: 'ad_reward',
                description: 'Free coins earned by watching 30-second ad',
                reference_id: `ad_${Date.now()}`,
                metadata: {
                  ad_duration: 30,
                  platform: Platform.OS
                }
              });

            if (!error) {
              // Update user's coin balance
              await supabase
                .from('profiles')
                .update({ 
                  coins: (profile?.coins || 0) + (adResult.reward || 100)
                })
                .eq('id', user.id);

              // Record claim time
              await AsyncStorage.setItem('lastFreeCoinsClaimTime', new Date().toISOString());
              
              // Refresh profile and check availability
              await refreshProfile();
              await checkFreeCoinsAvailability();

              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              showSuccess(
                '🎉 Coins Earned!',
                `${adResult.reward || 100} coins have been added to your account! Come back in 2 hours for more free coins.`
              );
            } else {
              throw new Error('Failed to award coins');
            }
          }
        } catch (error) {
          console.error('Error awarding free coins:', error);
          
          // Check for network errors and show appropriate alert
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
            console.log('🚨 NETWORK ERROR in handleFreeCoins - Showing network alert');
            showNetworkAlert();
          } else {
            showError('Error', 'Failed to award coins. Please try again.');
          }
        }
      } else {
        showError('Ad Failed', 'Unable to show ad. Please try again later.');
      }
    } catch (error) {
      console.error('Error handling free coins:', error);
      
      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        console.log('🚨 NETWORK ERROR in handleFreeCoins outer catch - Showing network alert');
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
    { icon: Star, title: 'Rate Us', subtitle: 'Get 100 Coins', route: '/rate-us' },
    { icon: Bug, title: 'Report Problem', subtitle: 'Technical Issues', route: '/report-problem' },
  ];

  const handleItemPress = (item: any) => {
    if (item.route) {
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
              fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 22
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
                        <Gift size={isVerySmallScreen ? 20 : 24} color={colors.success} />
                        <Animated.View style={[styles.sparkleIcon, sparkleAnimatedStyle]}>
                          <Sparkles size={isVerySmallScreen ? 8 : 10} color="#FFD700" />
                        </Animated.View>
                      </View>
                    ) : (
                      <Clock size={isVerySmallScreen ? 20 : 24} color={colors.textSecondary} />
                    )}
                  </View>
                </View>

                {/* Center Section - Content */}
                <View style={styles.freeCoinsCenterSection}>
                  <Text style={[
                    styles.freeCoinsTitle,
                    { 
                      color: freeCoinsAvailable ? colors.text : colors.textSecondary,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    {freeCoinsAvailable ? '🎬 Watch & Earn' : '⏰ Cooldown'}
                  </Text>
                  <Text style={[
                    styles.freeCoinsSubtitle,
                    { 
                      color: freeCoinsAvailable ? colors.textSecondary : colors.textSecondary,
                      fontSize: isVerySmallScreen ? 11 : 12
                    }
                  ]}>
                    {freeCoinsAvailable 
                      ? '30s ad = 100 coins' 
                      : `Next in ${timeRemaining}`
                    }
                  </Text>
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
                    <Coins size={isVerySmallScreen ? 12 : 14} color={freeCoinsAvailable ? '#FFD700' : colors.textSecondary} />
                    <Text style={[
                      styles.coinsAmount,
                      { 
                        color: freeCoinsAvailable ? '#FFD700' : colors.textSecondary,
                        fontSize: isVerySmallScreen ? 14 : 16
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
                    <Play size={isVerySmallScreen ? 14 : 16} color={colors.primary} />
                    <Text style={[
                      styles.adPreviewText,
                      { 
                        color: colors.primary,
                        fontSize: isVerySmallScreen ? 12 : 14
                      }
                    ]}>
                      {loading ? 'Loading Ad...' : 'Tap to watch 30s ad'}
                    </Text>
                    <Zap size={isVerySmallScreen ? 12 : 14} color={colors.primary} />
                  </View>
                </View>
              )}

              {!freeCoinsAvailable && timeRemaining && (
                <View style={styles.cooldownInfo}>
                  <View style={[styles.cooldownBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Clock size={isVerySmallScreen ? 14 : 16} color={colors.warning} />
                    <Text style={[
                      styles.cooldownText,
                      { 
                        color: colors.warning,
                        fontSize: isVerySmallScreen ? 12 : 14
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
                  <item.icon size={isVerySmallScreen ? 20 : 24} color={colors.accent} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[
                    styles.menuItemTitle, 
                    { 
                      color: colors.text,
                      fontSize: isVerySmallScreen ? 16 : 18
                    }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.menuItemSubtitle, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 12 : 14
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
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 20 : 24,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    paddingBottom: 60,
  },

  // Enhanced Free Coins Section
  freeCoinsSection: {
    marginBottom: isVerySmallScreen ? 32 : 40,
  },
  freeCoinsSectionTablet: {
    marginBottom: 48,
  },
  freeCoinsSectionTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 16 : 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  freeCoinsCard: {
    borderRadius: isVerySmallScreen ? 20 : 24,
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
    borderRadius: isVerySmallScreen ? 24 : 28,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    zIndex: 0,
  },
  freeCoinsGradient: {
    padding: isVerySmallScreen ? 16 : 20,
    zIndex: 2,
  },
  freeCoinsHorizontalLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 8 : 12,
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
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
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
    top: isVerySmallScreen ? -4 : -6,
    right: isVerySmallScreen ? -4 : -6,
  },
  freeCoinsTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 2 : 4,
    letterSpacing: 0.5,
  },
  freeCoinsSubtitle: {
    lineHeight: isVerySmallScreen ? 14 : 16,
    fontWeight: '500',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 4 : 6,
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
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 10,
    borderRadius: isVerySmallScreen ? 12 : 14,
    gap: isVerySmallScreen ? 8 : 10,
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
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 10,
    borderRadius: isVerySmallScreen ? 12 : 14,
    gap: isVerySmallScreen ? 8 : 10,
  },
  cooldownText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Main Menu Grid
  menuGrid: {
    gap: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  menuGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  menuItem: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItemTablet: {
    width: (screenWidth - 120) / 2,
  },
  menuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 20 : 24,
  },
  menuItemIcon: {
    width: isVerySmallScreen ? 48 : 52,
    height: isVerySmallScreen ? 48 : 52,
    borderRadius: isVerySmallScreen ? 24 : 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 16 : 20,
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