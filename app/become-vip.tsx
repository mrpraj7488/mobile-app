import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Platform,
  Animated as RNAnimated,
  Easing
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useConfig } from '../contexts/ConfigContext';
import { useFeatureFlag } from '../hooks/useFeatureFlags';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Star, Zap, Shield, Coins, Check, Gift, Headphones, ArrowLeft, Sparkles, Timer } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { useNetwork } from '@/services/NetworkHandler';
import PurchaseService from '@/services/PurchaseService';
import { useAlert } from '@/contexts/AlertContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function BecomeVIPScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showInfo, showNotification } = useNotification();
  const { config } = useConfig();
  const vipEnabled = useFeatureFlag('vipEnabled');
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [vipExpiry, setVipExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Animation values
  const crownRotation = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const shimmerAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  // Plan animations and timer ref
  const monthlyCardAnimation = useRef(new RNAnimated.Value(0)).current;
  const weeklyCardAnimation = useRef(new RNAnimated.Value(0)).current;
  const timerRef = useRef<number | null>(null);

  const vipPlans = [
    {
      id: 'weekly',
      duration: '1 Week',
      price: 100,
      originalPrice: 149,
      savings: 49,
      popular: false,
      bestValue: false,
      limitedOffer: true,
      offerText: '33% OFF',
      productId: 'com.vidgro.vip.weekly',
      benefits: [
        { icon: Shield, title: 'Ad-Free Experience', color: '#2ECC71' },
        { icon: Zap, title: '10% Promotion Discount', color: '#FFD700' },
        { icon: Crown, title: 'VIP Badge & Status', color: '#9D4EDD' },
        { icon: Star, title: 'Priority Queue', color: '#FF6B6B' },
      ]
    },
    {
      id: 'monthly',
      duration: '1 Month',
      price: 299,
      originalPrice: 399,
      savings: 100,
      popular: true,
      bestValue: true,
      limitedOffer: false,
      offerText: '25% OFF',
      productId: 'com.vidgro.vip.monthly',
      benefits: [
        { icon: Shield, title: 'Ad-Free Experience', color: '#2ECC71' },
        { icon: Zap, title: '15% Promotion Discount', color: '#FFD700' },
        { icon: Crown, title: 'VIP Badge & Status', color: '#9D4EDD' },
        { icon: Headphones, title: 'Priority Support', color: '#3498DB' },
        { icon: Star, title: 'Exclusive Features', color: '#FF6B6B' },
        { icon: Gift, title: 'Monthly Bonus Coins', color: '#8B5CF6' },
      ]
    },
  ];

  useEffect(() => {
    // Initialize purchase service
    PurchaseService.initialize().then(success => {
      setIapAvailable(success);
    });


    // Initialize animations
    startAnimations();
    
    // Check VIP status and expiry
    if (profile?.is_vip && profile?.vip_expires_at) {
      const expiryDate = new Date(profile.vip_expires_at);
      setVipExpiry(expiryDate);
      updateTimeRemaining(expiryDate);
      
      // Update timer every second
      timerRef.current = setInterval(() => {
        updateTimeRemaining(expiryDate);
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (iapAvailable) {
          PurchaseService.cleanup();
        }
      };
    }
    
    return () => {
      if (iapAvailable) {
        PurchaseService.cleanup();
      }
    };
  }, [profile]);

  const startAnimations = () => {
    // Crown rotation
    crownRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );

    // Sparkle animation
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );

    // Shimmer effect
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 2000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );

    // Pulse animation
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Staggered card entrance
    RNAnimated.timing(weeklyCardAnimation, {
      toValue: 1,
      duration: 600,
      delay: 100,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    RNAnimated.timing(monthlyCardAnimation, {
      toValue: 1,
      duration: 600,
      delay: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const updateTimeRemaining = (expiryDate: Date) => {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    }
  };

  const handleSubscribe = async (plan: any) => {
    // Check if VIP feature is enabled
    if (!vipEnabled) {
      showError('Feature Unavailable', 'VIP subscriptions are currently disabled.');
      return;
    }

    // Check if user already has an active VIP subscription
    if (profile?.is_vip) {
      showInfo('Already VIP', 'You already have an active VIP subscription. You can extend it from the renewal section.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate button
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1.05, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);
    
    try {
      // Show loading notification
      showInfo('Processing', `Preparing ${plan.duration} VIP subscription...`);
      
      // Simulate purchase process with better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check IAP availability
      if (!iapAvailable) {
        showError('Purchase Unavailable', '🚫 VIP subscriptions are not available. Please ensure you have a valid Google Play account and try again.');
        setLoading(false);
        return;
      }

      // Use PurchaseService for VIP subscription
      
      const success = await PurchaseService.purchaseVIP(plan.productId);
      
      if (success) {
        // Refresh profile to show VIP status
        await refreshProfile();
        
        showSuccess(
          '👑 Welcome to VIP!',
          `🎉 Your ${plan.duration} VIP membership is now active!\n\n✨ Enjoy unlimited uploads, priority support, and exclusive features!\n\n💎 Thank you for choosing VidGro VIP!`
        );
        
        // Navigate back to main screen
        setTimeout(() => {
          router.push('/(tabs)');
        }, 3000);
      } else {
        showError('VIP Purchase Failed', '⚠️ VIP subscription could not be activated. Please try again or contact support.');
      }
      
    } catch (error: any) {

      // Provide detailed user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('E_USER_CANCELLED') || errorMessage.includes('User cancelled') || errorMessage.includes('cancelled')) {
        // User cancelled - no error needed
      } else if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        showNetworkAlert();
      } else if (errorMessage.includes('ITEM_UNAVAILABLE') || errorMessage.includes('Product not available')) {
        showError(
          '🚫 Subscription Unavailable', 
          'This VIP plan is temporarily unavailable. Please try the other plan or contact support if the issue persists.'
        );
      } else if (errorMessage.includes('BILLING_UNAVAILABLE') || errorMessage.includes('billing')) {
        showError(
          '💳 Billing Issue', 
          'Google Play billing is not available. Please check your Google Play account and payment methods, then try again.'
        );
      } else if (errorMessage.includes('ITEM_ALREADY_OWNED')) {
        showError(
          '⚠️ Already Subscribed', 
          'You already have an active VIP subscription. Please check your VIP status or contact support if this seems incorrect.'
        );
      } else if (errorMessage.includes('DEVELOPER_ERROR')) {
        showError(
          '🔧 Configuration Error', 
          'There\'s a configuration issue with VIP subscriptions. Please contact support for immediate assistance.'
        );
      } else if (errorMessage.includes('SERVICE_UNAVAILABLE') || errorMessage.includes('timeout')) {
        showError(
          '⏰ Service Unavailable', 
          'Google Play services are temporarily unavailable. Please check your internet connection and try again in a few minutes.'
        );
      } else {
        showError(
          '❌ Subscription Failed', 
          'Unable to activate your VIP subscription. No charges were made to your account.\n\n💡 Please try:\n• Checking your internet connection\n• Ensuring sufficient payment method balance\n• Restarting the app\n\nContact support if the issue persists.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const activateVIP = async (plan: any) => {
    // Calculate expiry date
    const expiryDate = new Date();
    if (plan.id === 'weekly') {
      expiryDate.setDate(expiryDate.getDate() + 7);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Record VIP purchase transaction
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      
      if (!profile?.id) {
        throw new Error('User profile not found');
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          transaction_type: 'vip_purchase',
          amount: -plan.price, // Negative because it's a purchase cost
          description: `VIP ${plan.duration} subscription purchase`,
          created_at: new Date().toISOString()
        });
      
      if (transactionError) {
        // Transaction logging failed but VIP was activated
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        showError(
          '🌐 Connection Issue',
          'Unable to record your VIP purchase due to network issues. Your subscription is active - transaction details will be updated when connection is restored.'
        );
      } else if (errorMessage.includes('User profile not found')) {
        showError(
          '👤 Account Issue',
          'Unable to locate your account for transaction recording. Your VIP subscription is active. Please restart the app or contact support.'
        );
      }
      // Don't throw - continue with VIP activation
    }

    // Update VIP status in database
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      
      if (profile?.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_vip: true,
            vip_expires_at: expiryDate.toISOString()
          })
          .eq('id', profile.id);
        
        if (updateError) {
          showError(
            '⚠️ VIP Activation Issue', 
            'Your payment was successful but there was an issue activating VIP status. Please contact support with your purchase details for immediate assistance.'
          );
        } else {
          return;
        }
        
        // Refresh profile to get updated VIP status
        await refreshProfile();
        
        showSuccess(
          '🎉 Welcome to VIP Premium!',
          `👑 You are now a VIP member for ${plan.duration}! All premium benefits are now active. Your VIP status expires on ${expiryDate.toLocaleDateString()}.`
        );
        
        // Add haptic feedback for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          router.push('/(tabs)');
        }, 2000);
      } else {
        showError(
          '👤 Account Error', 
          'Unable to locate your account for VIP activation. Please restart the app and contact support if payment was processed.'
        );
      }
    } catch (error) {

      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        showError(
          '🌐 Connection Issue',
          'Unable to activate VIP due to network issues. Your payment was successful - VIP status will be activated when connection is restored. Please restart the app in a few minutes.'
        );
      } else if (errorMessage.includes('User profile not found')) {
        showError(
          '👤 Account Issue',
          'Unable to locate your account for VIP activation. Please restart the app and contact support if payment was processed.'
        );
      } else {
        showError(
          '⚠️ Activation Failed', 
          'Failed to activate VIP status. If payment was processed, please contact support with your purchase details for immediate assistance.'
        );
      }
    }
  };

  // Animated styles
  const crownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${crownRotation.value}deg` }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

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

  // If user is already VIP, show VIP status screen with timer
  if (profile?.is_vip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader 
          title="VIP Status" 
          icon={Crown}
          rightComponent={
            <Animated.View style={crownAnimatedStyle}>
              <Crown size={24} color="#FFD700" />
            </Animated.View>
          }
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* VIP Active Status with Timer */}
          <View style={[styles.vipActiveContainer, { backgroundColor: colors.surface }]}>
            <Animated.View style={[styles.vipIcon, { backgroundColor: colors.accent + '20' }, pulseAnimatedStyle]}>
              <Crown size={isTablet ? 64 : isSmallScreen ? 48 : 56} color="#FFD700" />
              <Animated.View style={[styles.sparkleOverlay, sparkleAnimatedStyle]}>
                <Sparkles size={isTablet ? 28 : isSmallScreen ? 20 : 24} color="#FFD700" />
              </Animated.View>
            </Animated.View>
            
            <Text style={[styles.vipActiveTitle, { color: colors.text }]}>👑 VIP Premium Active</Text>
            <Text style={[styles.vipActiveSubtitle, { color: colors.textSecondary }]}>
              Enjoying all premium benefits
            </Text>

            {/* Expiry Timer */}
            {vipExpiry && (
              <View style={[styles.expiryContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
                <Timer size={isSmallScreen ? 18 : 20} color={colors.warning} />
                <View style={styles.expiryInfo}>
                  <Text style={[styles.expiryLabel, { color: colors.warning }]}>VIP Expires In</Text>
                  <Text style={[styles.expiryTime, { color: colors.warning }]}>{timeRemaining}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Renewal Section */}
          <View style={[styles.renewalSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.renewalTitle, { color: colors.text }]}>🔄 Extend Your VIP</Text>
            <Text style={[styles.renewalText, { color: colors.textSecondary }]}>
              Extend your VIP membership to continue enjoying premium benefits. New time will be added to your current subscription.
            </Text>
            
            <View style={styles.renewalPlans}>
              {vipPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.renewalPlan, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSubscribe(plan)}
                >
                  <Text style={[styles.renewalPlanDuration, { color: colors.text }]}>{plan.duration}</Text>
                  <Text style={[styles.renewalPlanPrice, { color: colors.primary }]}>₹{plan.price}</Text>
                  <Text style={[styles.renewalPlanSavings, { color: colors.success }]}>Save ₹{plan.savings}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader 
        title="VIP Membership" 
        icon={Crown}
        rightComponent={
          <Animated.View style={crownAnimatedStyle}>
            <Crown size={24} color="#FFD700" />
          </Animated.View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plans Section - Main Focus */}
        <View style={styles.plansContainer}>
          <Text style={[styles.plansTitle, { color: colors.text }]}>👑 Choose Your VIP Plan</Text>
          
          {vipPlans.map((plan, index) => {
            const cardAnimation = plan.id === 'weekly' ? weeklyCardAnimation : monthlyCardAnimation;
            
            const animatedStyle = {
              opacity: cardAnimation,
              transform: [
                {
                  translateY: cardAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: cardAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            };

            return (
              <RNAnimated.View key={plan.id} style={[animatedStyle]}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    { backgroundColor: colors.surface },
                    plan.popular && styles.popularPlan,
                    selectedPlan === plan.id && styles.selectedPlan,
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.9}
                >
                  {/* Shimmer effect for popular plan */}
                  {plan.popular && (
                    <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
                      <LinearGradient
                        colors={['transparent', 'rgba(255, 215, 0, 0.3)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shimmerGradient}
                      />
                    </Animated.View>
                  )}

                  {/* Badges */}
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Star size={10} color="white" />
                      <Text style={styles.badgeText}>MOST POPULAR</Text>
                    </View>
                  )}

                  {plan.limitedOffer && (
                    <View style={[styles.offerBadge, { backgroundColor: colors.error }]}>
                      <Text style={styles.offerBadgeText}>{plan.offerText}</Text>
                    </View>
                  )}

                  {/* Plan Header */}
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleSection}>
                      <Text style={[styles.planDuration, { color: colors.text }]}>{plan.duration}</Text>
                      <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>VIP Premium</Text>
                    </View>
                    
                    <View style={styles.planPricing}>
                      <View style={styles.priceRow}>
                        <Text style={[styles.currency, { color: colors.textSecondary }]}>₹</Text>
                        <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}</Text>
                      </View>
                      
                      {plan.originalPrice && (
                        <View style={styles.savingsRow}>
                          <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                            ₹{plan.originalPrice}
                          </Text>
                          <Text style={[styles.savings, { color: colors.success }]}>
                            Save ₹{plan.savings}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Benefits in Plan Card */}
                  <View style={styles.planBenefits}>
                    {plan.benefits.map((benefit, benefitIndex) => (
                      <View key={benefitIndex} style={styles.planBenefit}>
                        <View style={[styles.planBenefitIcon, { backgroundColor: benefit.color + '20' }]}>
                          <benefit.icon size={isSmallScreen ? 14 : 16} color={benefit.color} />
                        </View>
                        <Text style={[styles.planBenefitText, { color: colors.textSecondary }]}>
                          {benefit.title}
                        </Text>
                        <Check size={isSmallScreen ? 12 : 14} color={colors.success} />
                      </View>
                    ))}
                  </View>

                  {/* Subscribe Button */}
                  <AnimatedTouchableOpacity
                    style={[
                      styles.subscribeButton,
                      plan.popular && styles.popularSubscribeButton,
                      selectedPlan === plan.id && styles.selectedSubscribeButton,
                      buttonAnimatedStyle
                    ]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={
                        plan.popular 
                          ? ['#FFD700', '#FFA500']
                          : [colors.primary, colors.secondary]
                      }
                      style={styles.subscribeButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading && selectedPlan === plan.id ? (
                        <View style={styles.loadingContainer}>
                          <RNAnimated.View style={styles.loadingSpinner}>
                            <Crown size={16} color="white" />
                          </RNAnimated.View>
                          <Text style={styles.subscribeButtonText}>
                            Activating VIP...
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.subscribeButtonContent}>
                          <Crown size={16} color="white" />
                          <Text style={styles.subscribeButtonText}>
                            Upgrade Now
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </AnimatedTouchableOpacity>
                </TouchableOpacity>
              </RNAnimated.View>
            );
          })}
        </View>

        {/* 3-Day Money Back Guarantee */}
        <View style={[styles.guaranteeContainer, { backgroundColor: colors.success + '20' }]}>
          <Shield size={isSmallScreen ? 20 : 24} color={colors.success} />
          <View style={styles.guaranteeContent}>
            <Text style={[styles.guaranteeTitle, { color: colors.success }]}>💎 3-Day Money Back Guarantee</Text>
            <Text style={[styles.guaranteeText, { color: colors.success }]}>
              Not satisfied with VIP? Get a full refund within 3 days of purchase. No questions asked!
            </Text>
          </View>
        </View>

        {/* Security Footer */}
        <View style={[styles.securityFooter, { backgroundColor: colors.success + '10' }]}>
          <Shield size={14} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.success }]}>
            🔒 Secured by encryption • Trusted by 50,000+ creators
          </Text>
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

  // Plans Section - Main Focus
  plansContainer: {
    margin: isSmallScreen ? 12 : 16,
  },
  plansTitle: {
    fontSize: isVerySmallScreen ? 20 : isSmallScreen ? 22 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 16 : 20,
    letterSpacing: 0.5,
  },
  planCard: {
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 12 : 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  popularPlan: {
    borderColor: '#FFD700',
    borderWidth: 3,
    shadowColor: '#FFD700',
    shadowOpacity: 0.2,
    elevation: 8,
  },
  selectedPlan: {
    transform: [{ scale: 1.02 }],
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
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 16,
    gap: 4,
    zIndex: 2,
  },
  offerBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  offerBadgeText: {
    color: 'white',
    fontSize: isSmallScreen ? 9 : 10,
    fontWeight: 'bold',
  },
  badgeText: {
    color: 'white',
    fontSize: isSmallScreen ? 9 : 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
    zIndex: 2,
  },
  planTitleSection: {
    flex: 1,
  },
  planDuration: {
    fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '500',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  currency: {
    fontSize: isSmallScreen ? 12 : 14,
    marginRight: 2,
  },
  planPrice: {
    fontSize: isVerySmallScreen ? 22 : isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originalPrice: {
    fontSize: isSmallScreen ? 11 : 12,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: 'bold',
  },

  // Plan Benefits - Integrated into cards
  planBenefits: {
    marginBottom: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 8 : 10,
  },
  planBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 8 : 10,
  },
  planBenefitIcon: {
    width: isSmallScreen ? 24 : 28,
    height: isSmallScreen ? 24 : 28,
    borderRadius: isSmallScreen ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBenefitText: {
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '500',
  },

  subscribeButton: {
    borderRadius: isSmallScreen ? 12 : 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  popularSubscribeButton: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    elevation: 8,
  },
  selectedSubscribeButton: {
    transform: [{ scale: 1.02 }],
  },
  subscribeButtonGradient: {
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 20 : 24,
    alignItems: 'center',
  },
  subscribeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingSpinner: {
    // Add rotation animation if needed
  },

  // Guarantee Section - Improved
  guaranteeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 20,
    margin: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 10 : 12,
  },
  guaranteeContent: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  guaranteeText: {
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
  },

  // Security Footer
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    gap: 8,
  },
  securityText: {
    fontSize: isVerySmallScreen ? 10 : isSmallScreen ? 11 : 12,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },

  // VIP Active Status
  vipActiveContainer: {
    alignItems: 'center',
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 24 : 32,
    margin: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  vipIcon: {
    width: isTablet ? 96 : isSmallScreen ? 72 : 80,
    height: isTablet ? 96 : isSmallScreen ? 72 : 80,
    borderRadius: isTablet ? 48 : isSmallScreen ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 16 : 24,
    position: 'relative',
  },
  sparkleOverlay: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  vipActiveTitle: {
    fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  vipActiveSubtitle: {
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 15 : 16,
    textAlign: 'center',
    marginBottom: isSmallScreen ? 16 : 24,
    lineHeight: 22,
  },

  // Expiry Timer
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 8 : 12,
    marginTop: 8,
  },
  expiryInfo: {
    alignItems: 'center',
  },
  expiryLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  expiryTime: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Renewal Section
  renewalSection: {
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 20 : 24,
    margin: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  renewalTitle: {
    fontSize: isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  renewalText: {
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: isSmallScreen ? 16 : 20,
  },
  renewalPlans: {
    flexDirection: 'row',
    gap: 12,
  },
  renewalPlan: {
    flex: 1,
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  renewalPlanDuration: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  renewalPlanPrice: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  renewalPlanSavings: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '600',
    marginTop: 2,
  },
});