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
import { useAlert } from '@/contexts/AlertContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins, Crown, Star, CheckCircle, Zap, Users, Shield, Clock, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getSupabase } from '../lib/supabase';
import { useNetwork } from '../services/NetworkHandler';
import ScreenHeader from '@/components/ScreenHeader';
import PurchaseService from '@/services/PurchaseService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Easing as ReanimatedEasing
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isTinyScreen = screenWidth < 350;
const isVerySmallScreen = screenWidth < 320;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  originalPrice?: number;
  bonus: number;
  popular: boolean;
  badge?: string;
  productId: string;
  savings: number;
  valueProps: string[];
  socialProof: string;
  bestValue: boolean;
  limitedTime: boolean;
}

export default function BuyCoinsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { showInfo } = useNotification();
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  
  // Animation values
  const shimmerAnimation = useSharedValue(0);
  const cardAnimations = useRef<{ [key: string]: RNAnimated.Value }>({});
  
  // Create button animations for each package using hooks properly
  const starterButtonAnim = useSharedValue(1);
  const creatorButtonAnim = useSharedValue(1);
  const proButtonAnim = useSharedValue(1);
  const premiumButtonAnim = useSharedValue(1);
  
  const buttonAnimationRefs = useRef<{ [key: string]: Animated.SharedValue<number> }>({});

  const coinPackages: CoinPackage[] = [
    {
      id: 'starter',
      coins: 1000,
      price: 29,
      originalPrice: 39,
      bonus: 100,
      popular: false,
      productId: 'com.vidgro.coins.starter',
      badge: undefined,
      savings: 10,
      valueProps: ['Instant delivery', 'No ads'],
      socialProof: '2K+ bought today',
      bestValue: false,
      limitedTime: false
    },
    {
      id: 'creator',
      coins: 2500,
      price: 69,
      originalPrice: 89,
      bonus: 500,
      popular: true,
      badge: 'POPULAR',
      productId: 'com.vidgro.coins.creator',
      savings: 20,
      valueProps: ['Priority support', 'Bonus features'],
      socialProof: '5K+ creators love this',
      bestValue: false,
      limitedTime: false
    },
    {
      id: 'pro',
      coins: 5000,
      price: 129,
      originalPrice: 179,
      bonus: 1500,
      popular: false,
      badge: 'BEST VALUE',
      productId: 'com.vidgro.coins.pro',
      savings: 50,
      valueProps: ['VIP status', 'Exclusive content'],
      socialProof: 'Best value for pros',
      bestValue: true,
      limitedTime: false
    },
    {
      id: 'premium',
      coins: 10000,
      price: 249,
      originalPrice: 349,
      bonus: 5000,
      popular: true,
      badge: 'PREMIUM',
      productId: 'com.vidgro.coins.premium',
      savings: 100,
      valueProps: ['Lifetime perks', 'Premium badge'],
      socialProof: 'Top creators choice',
      bestValue: false,
      limitedTime: true
    },
  ];
  
  // Initialize all animations in a single place
  const initializeAnimations = () => {
    coinPackages.forEach(pkg => {
      if (!cardAnimations.current[pkg.id]) {
        cardAnimations.current[pkg.id] = new RNAnimated.Value(0);
      }
    });
    
    // Map button animations to refs
    buttonAnimationRefs.current['starter'] = starterButtonAnim;
    buttonAnimationRefs.current['creator'] = creatorButtonAnim;
    buttonAnimationRefs.current['pro'] = proButtonAnim;
    buttonAnimationRefs.current['premium'] = premiumButtonAnim;
  };
  
  // Call initialization immediately
  initializeAnimations();

  useEffect(() => {
    // Ensure animations are initialized
    initializeAnimations();
    
    initializeIAP();
    
    // Staggered card entrance
    coinPackages.forEach((pkg, index) => {
      if (cardAnimations.current[pkg.id]) {
        RNAnimated.timing(cardAnimations.current[pkg.id], {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }).start();
      }
    });

    // Continuous shimmer animation
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );

    return () => {
      // Only end connection if IAP was available
      if (iapAvailable && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        import('react-native-iap').then(InAppPurchases => {
          InAppPurchases.endConnection();
        }).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []);

  const initializeIAP = async () => {
    try {
      // Dynamically import IAP for Android platform
      const InAppPurchases = await import('react-native-iap');
      
      const result = await InAppPurchases.initConnection();
      
      setIapAvailable(true);

      if (Platform.OS === 'android') {
        await InAppPurchases.flushFailedPurchasesCachedAsPendingAndroid();
      }

      // Get available products
      const productIds = coinPackages.map(pkg => pkg.productId);
      const availableProducts = await InAppPurchases.getProducts({ skus: productIds });
      setProducts(availableProducts);
      
      // Show error if no products found
      if (availableProducts.length === 0) {
        showError('Products Unavailable', '⚠️ Coin packages are currently unavailable. Please try again in a few minutes or restart the app.');
      }
      
    } catch (error) {
      setIapAvailable(false);
      showError('Purchase Setup Failed', '🔧 Unable to set up in-app purchases. Please ensure:\n\n• You have a stable internet connection\n• Google Play Store is updated\n• Your device supports purchases\n\n💡 Try restarting the app or contact support.');
    }
  };

  const recordPurchaseTransaction = async (packageItem: CoinPackage, transactionId: string) => {
    if (!user) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: packageItem.coins + packageItem.bonus,
          transaction_type: 'coin_purchase',
          description: `Purchased ${packageItem.coins.toLocaleString()} + ${packageItem.bonus.toLocaleString()} bonus coins`,
        });

      if (error) {
        // Transaction recording failed but coins were added
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        showError(
          '🌐 Connection Issue',
          'Unable to process your coins due to network issues. Your payment was successful - coins will be added automatically when connection is restored.'
        );
      } else if (errorMessage.includes('User profile not found')) {
        showError(
          '👤 Account Issue',
          'Unable to locate your account. Please restart the app and try again, or contact support if the issue persists.'
        );
      } else {
        showError(
          '⚠️ Transaction Issue',
          'Your payment was processed but there was an issue adding coins. Please contact support with your transaction details for immediate assistance.'
        );
      }
      throw error; // Re-throw to handle in purchase flow
    }
  };

  const handlePurchase = async (packageItem: CoinPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate button
    buttonAnimationRefs.current[packageItem.id].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1.05, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedPackage(packageItem.id);
    setLoading(true);

    try {
      if (!iapAvailable) {
        showError('Purchase Unavailable', '🚫 In-app purchases are not available. Please ensure you have a valid Google Play account and try again.');
        setLoading(false);
        setSelectedPackage(null);
        return;
      }

      const success = await PurchaseService.purchaseCoins(packageItem.productId);
      
      if (success) {
        try {
          // Record transaction and update coins
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh profile to show new coin balance
          await refreshProfile();

          // Add haptic feedback for success
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          showSuccess(
            '🎉 Purchase Successful!',
            `🪙 ${(packageItem.coins + packageItem.bonus).toLocaleString()} coins added to your account!\n\n🎯 You're now ready to promote your videos and reach viral status!\n\n💎 Thank you for choosing VidGro Premium!`
          );
          
          // Navigate to promote tab after a delay
          setTimeout(() => {
            router.push('/(tabs)/promote');
          }, 3000);
          
        } catch (transactionError) {
          // Payment succeeded but transaction recording failed
          showError(
            '⚠️ Coins Processing',
            'Your payment was successful! Coins are being processed and will appear in your account shortly. If they don\'t appear within 5 minutes, please contact support.'
          );
        }
      } else {
        showError(
          '💳 Purchase Failed', 
          'Your purchase could not be completed. No charges were made to your account.\n\n💡 Please try:\n• Checking your internet connection\n• Ensuring sufficient payment method balance\n• Restarting the app\n\nContact support if the issue persists.'
        );
      }
    } catch (error: any) {
      
      // Provide detailed user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User cancelled') || errorMessage.includes('cancelled') || errorMessage.includes('E_USER_CANCELLED')) {
        // User cancelled - no error needed
      } else if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        showNetworkAlert();
      } else if (errorMessage.includes('Product not available') || errorMessage.includes('not found') || errorMessage.includes('ITEM_UNAVAILABLE')) {
        showError(
          '🚫 Product Unavailable', 
          'This coin package is temporarily unavailable. Please try again later or contact support if the issue persists.'
        );
      } else if (errorMessage.includes('BILLING_UNAVAILABLE') || errorMessage.includes('billing')) {
        showError(
          '💳 Billing Issue', 
          'Google Play billing is not available. Please check your Google Play account and payment methods, then try again.'
        );
      } else if (errorMessage.includes('ITEM_ALREADY_OWNED')) {
        showError(
          '⚠️ Already Purchased', 
          'You already own this item. Please check your coin balance or contact support if coins were not added.'
        );
      } else if (errorMessage.includes('DEVELOPER_ERROR')) {
        showError(
          '🔧 Configuration Error', 
          'There\'s a configuration issue with this purchase. Please contact support for assistance.'
        );
      } else if (errorMessage.includes('SERVICE_UNAVAILABLE') || errorMessage.includes('timeout')) {
        showError(
          '⏰ Service Unavailable', 
          'Google Play services are temporarily unavailable. Please check your internet connection and try again in a few minutes.'
        );
      } else {
        showError(
          '❌ Purchase Failed', 
          'Something went wrong with your purchase. Please check your internet connection and try again. If the problem persists, contact our support team.'
        );
      }
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

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

  const renderPackageCard = (packageItem: CoinPackage, index: number) => {
    // Get or create animation values
    let cardAnimation = cardAnimations.current[packageItem.id];
    let buttonAnimation = buttonAnimationRefs.current[packageItem.id];
    
    // Fallback if animations don't exist
    if (!cardAnimation) {
      cardAnimation = new RNAnimated.Value(1);
      cardAnimations.current[packageItem.id] = cardAnimation;
    }
    if (!buttonAnimation) {
      // Use a default value if button animation doesn't exist
      buttonAnimation = { value: 1 } as Animated.SharedValue<number>;
    }
    
    const animatedStyle = cardAnimation ? {
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
    } : { opacity: 1, transform: [] };

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: buttonAnimation ? buttonAnimation.value : 1 }],
    }));

    const isSelected = selectedPackage === packageItem.id;
    const costPerThousand = (packageItem.price / (packageItem.coins + packageItem.bonus) * 1000).toFixed(1);

    return (
      <RNAnimated.View key={packageItem.id} style={[animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.packageCard,
            { backgroundColor: colors.surface },
            packageItem.popular && styles.popularPackage,
            packageItem.bestValue && styles.bestValuePackage,
            isSelected && styles.selectedPackage,
            isTablet && styles.packageCardTablet
          ]}
          onPress={() => handlePurchase(packageItem)}
          disabled={loading}
          activeOpacity={0.9}
        >
          {/* Shimmer effect for popular packages */}
          {packageItem.popular && (
            <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255, 215, 0, 0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}

          {/* Badge */}
          {packageItem.badge && (
            <View style={[
              styles.packageBadge,
              packageItem.popular && styles.popularBadge,
              packageItem.bestValue && styles.bestValueBadge
            ]}>
              {packageItem.popular && <Crown size={10} color="white" />}
              {packageItem.bestValue && <Star size={10} color="white" />}
              <Text style={styles.badgeText}>
                {packageItem.badge}
              </Text>
            </View>
          )}

          {/* Limited time indicator */}
          {packageItem.limitedTime && (
            <View style={[styles.limitedTimeBadge, { backgroundColor: colors.error }]}>
              <Clock size={8} color="white" />
              <Text style={styles.limitedTimeText}>
                24H LEFT
              </Text>
            </View>
          )}

          {/* Responsive Layout Content */}
          <View style={[styles.horizontalContent, isTablet && styles.horizontalContentTablet]}>
            {/* Left side - Coin info */}
            <View style={styles.leftSection}>
              <Text style={[styles.coinAmount, { color: colors.text }, isTablet && styles.coinAmountTablet]}>
                {packageItem.coins.toLocaleString()}
              </Text>
              <Text style={[styles.coinLabel, { color: colors.textSecondary }]}>
                COINS
              </Text>

              {/* Bonus section */}
              {packageItem.bonus > 0 && (
                <View style={[styles.bonusContainer, { backgroundColor: colors.success + '20' }]}>
                  <Sparkles size={10} color={colors.success} />
                  <Text style={[styles.bonusText, { color: colors.success }]}>
                    +{packageItem.bonus.toLocaleString()} BONUS
                  </Text>
                </View>
              )}

              {/* Total coins */}
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: colors.accent }, isTablet && styles.totalValueTablet]}>
                  {(packageItem.coins + packageItem.bonus).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Right side - Price and purchase */}
            <View style={styles.rightSection}>
              {/* Price section */}
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text style={[styles.currency, { color: colors.textSecondary }]}>₹</Text>
                  <Text style={[styles.price, { color: colors.text }, isTablet && styles.priceTablet]}>
                    {packageItem.price}
                  </Text>
                </View>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  one-time
                </Text>
              </View>

              {/* Value info */}
              <View style={styles.valueInfo}>
                <Text style={[styles.costPerThousand, { color: colors.textSecondary }]}>
                  ₹{costPerThousand}/1K coins
                </Text>
                {packageItem.originalPrice && (
                  <View style={styles.savingsRow}>
                    <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                      ₹{packageItem.originalPrice}
                    </Text>
                    <Text style={[styles.savings, { color: colors.success }]}>
                      Save ₹{packageItem.savings}
                    </Text>
                  </View>
                )}
              </View>

              {/* Animated Purchase button */}
              <AnimatedTouchableOpacity
                style={[
                  styles.purchaseButton,
                  packageItem.popular && styles.popularPurchaseButton,
                  packageItem.bestValue && styles.bestValuePurchaseButton,
                  isSelected && styles.selectedPurchaseButton,
                  buttonAnimatedStyle
                ]}
                onPress={() => handlePurchase(packageItem)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    packageItem.popular 
                      ? ['#FFD700', '#FFA500']
                      : packageItem.bestValue
                      ? ['#9D4EDD', '#7B2CBF']
                      : [colors.primary, colors.secondary]
                  }
                  style={styles.purchaseButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isSelected && loading ? (
                    <View style={styles.loadingContainer}>
                      <RNAnimated.View style={styles.loadingSpinner}>
                        <Coins size={14} color="white" />
                      </RNAnimated.View>
                      <Text style={styles.purchaseButtonText}>
                        Processing...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.purchaseButtonContent}>
                      <Zap size={12} color="white" />
                      <Text style={styles.purchaseButtonText}>
                        Get Now
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </AnimatedTouchableOpacity>
            </View>
          </View>

          {/* Bottom section - Value props and social proof */}
          <View style={styles.bottomSection}>
            {/* Value props - Responsive for different screen sizes */}
            <View style={[styles.valueProps, isTablet && styles.valuePropsTablet]}>
              {packageItem.valueProps.slice(0, isTablet ? 3 : 2).map((prop, propIndex) => (
                <View key={propIndex} style={styles.valueProp}>
                  <CheckCircle size={8} color={colors.success} />
                  <Text style={[styles.valuePropText, { color: colors.textSecondary }]}>
                    {prop}
                  </Text>
                </View>
              ))}
            </View>

            {/* Social proof - Responsive */}
            <View style={[styles.socialProof, { backgroundColor: colors.primary + '15' }]}>
              <Users size={10} color={colors.primary} />
              <Text style={[styles.socialProofText, { color: colors.primary }]}>
                {packageItem.socialProof}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader 
        title="Buy Coins" 
        icon={Coins}
        rightComponent={
          <View style={styles.headerCoinDisplay}>
            <View style={[styles.headerCoinBadge, { 
              backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.15)',
              borderColor: isDark ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.2)'
            }]}>
              <Text style={styles.headerCoinIcon}>🪙</Text>
              <Text style={styles.headerCoinText}>{profile?.coins?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        }
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        {/* Package grid - Responsive layout */}
        <View style={styles.packagesContainer}>
          <Text style={[styles.packagesTitle, { color: colors.text }, isTablet && styles.packagesTitleTablet]}>
            💎 Choose Your Power Level
          </Text>
          
          <View style={[styles.packagesGrid, isTablet && styles.packagesGridTablet]}>
            {coinPackages.map((packageItem, index) => renderPackageCard(packageItem, index))}
          </View>
        </View>

        {/* Trust signals - Responsive */}
        <View style={[styles.trustSection, { backgroundColor: colors.surface }, isTablet && styles.trustSectionTablet]}>
          <Text style={[styles.trustTitle, { color: colors.text }]}>
            🛡️ Security & Guarantees
          </Text>
          
          <View style={[styles.trustSignals, isTablet && styles.trustSignalsTablet]}>
            <View style={[styles.trustSignal, { backgroundColor: colors.success + '15' }]}>
              <Shield size={16} color={colors.success} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  Bank-Grade Security
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  256-bit SSL encryption
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.primary + '15' }]}>
              <CheckCircle size={16} color={colors.primary} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  Instant Delivery
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  Coins added immediately
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.warning + '15' }]}>
              <Star size={16} color={colors.warning} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  30-Day Guarantee
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  Full refund if not satisfied
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security footer - Responsive */}
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
  headerCoinDisplay: {
    flexShrink: 0,
  },
  headerCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    minWidth: 90,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerCoinIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  headerCoinText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  packagesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 20,
  },
  packagesTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  packagesTitleTablet: {
    fontSize: 28,
    marginBottom: 32,
  },
  packagesGrid: {
    gap: 12,
  },
  packagesGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  packageCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  packageCardTablet: {
    width: (screenWidth - 120) / 2, // 2 columns on tablet
    padding: 24,
  },
  popularPackage: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.2,
    elevation: 10,
  },
  bestValuePackage: {
    borderColor: '#9D4EDD',
    borderWidth: 2,
    shadowColor: '#9D4EDD',
    shadowOpacity: 0.2,
    elevation: 10,
  },
  selectedPackage: {
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
  packageBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    zIndex: 2,
  },
  popularBadge: {
    backgroundColor: '#FFD700',
  },
  bestValueBadge: {
    backgroundColor: '#9D4EDD',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  limitedTimeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    zIndex: 2,
  },
  limitedTimeText: {
    color: 'white',
    fontSize: 7,
    fontWeight: 'bold',
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 12,
  },
  horizontalContentTablet: {
    marginBottom: 16,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: isTablet ? 120 : 100,
  },
  coinAmount: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  coinAmountTablet: {
    fontSize: 32,
  },
  coinLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    gap: 3,
  },
  bonusText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  totalContainer: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 9,
    marginBottom: 2,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  totalValueTablet: {
    fontSize: 20,
  },
  priceSection: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 12,
    marginRight: 2,
  },
  price: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceTablet: {
    fontSize: 28,
  },
  priceLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  valueInfo: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  costPerThousand: {
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 2,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  originalPrice: {
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  purchaseButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: isTablet ? 100 : 80,
  },
  popularPurchaseButton: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bestValuePurchaseButton: {
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedPurchaseButton: {
    transform: [{ scale: 1.02 }],
  },
  purchaseButtonGradient: {
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 16 : 12,
    alignItems: 'center',
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: isTablet ? 13 : 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingSpinner: {
    // Add rotation animation here if needed
  },
  bottomSection: {
    zIndex: 2,
  },
  valueProps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  valuePropsTablet: {
    gap: 12,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  valuePropText: {
    fontSize: isTablet ? 10 : 8,
    fontWeight: '500',
    flex: 1,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  socialProofText: {
    fontSize: isTablet ? 10 : 8,
    fontWeight: '600',
  },
  trustSection: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  trustSectionTablet: {
    margin: 24,
    padding: 32,
  },
  trustTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  trustSignals: {
    gap: 12,
  },
  trustSignalsTablet: {
    flexDirection: 'row',
    gap: 20,
  },
  trustSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    flex: isTablet ? 1 : undefined,
  },
  trustContent: {
    flex: 1,
  },
  trustSignalTitle: {
    fontSize: isVerySmallScreen ? 12 : 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  trustSignalText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    lineHeight: 16,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  securityText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },
});