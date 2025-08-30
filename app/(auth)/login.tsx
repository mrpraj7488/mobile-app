import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, Gift, Users, Sparkles, Star, Mail, Lock, UserPlus } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import GoogleAuthService from '../../services/GoogleAuthService';
import EmailAuthService from '../../services/EmailAuthService';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isVerySmallScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showInfo } = useNotification();
  const router = useRouter();
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);
  const slideAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Redirect if already logged in
    if (user && profile) {
      router.replace('/(tabs)');
    }
  }, [user, profile, router]);

  useEffect(() => {
    // Auto-show email form in Expo Go since Google Sign-In won't work
    if (__DEV__ && Platform.OS !== 'web') {
      setShowEmailForm(true);
    }
  }, []);

  useEffect(() => {
    // Start animations after component mount
    const timer = setTimeout(() => {
      sparkleRotation.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );
      
      glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000 }),
        -1,
        true
      );
      
      slideAnimation.value = withTiming(1, { duration: 800 });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 150);
    
    setGoogleLoading(true);
    
    try {
      // Check if running in Expo Go (development)
      const isExpoGo = __DEV__ && Platform.OS !== 'web';
      
      if (isExpoGo) {
        showInfo(
          'Development Mode',
          'Google Sign-In requires a production build. Please use email sign-in for testing in Expo Go.'
        );
        setShowEmailForm(true);
        setGoogleLoading(false);
        return;
      }
      
      const googleAuthService = GoogleAuthService.getInstance();
      const result = await googleAuthService.signInWithGoogle(
        referralCode.trim() || undefined
      );
      
      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        if (referralCode.trim()) {
          showSuccess(
            '🎉 Welcome to VidGro!',
            'Successfully signed in with Google! You and your referrer have both earned 400 coins as a welcome bonus.'
          );
        } else {
          showSuccess(
            '🎉 Welcome to VidGro!',
            'Successfully signed in with Google! Start promoting your videos and earning coins.'
          );
        }
        
        // Navigation will be handled by useEffect when profile loads
      } else {
        showError(
          'Sign In Failed',
          result.error || 'Unable to sign in with Google. Please try again.'
        );
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      
      // Handle TurboModule error specifically
      if (error instanceof Error && error.message.includes('RNGoogleSignin')) {
        showInfo(
          'Development Mode',
          'Google Sign-In requires a production build. Please use email sign-in for testing.'
        );
        setShowEmailForm(true);
      } else {
        showError(
          'Connection Error',
          'Unable to connect to Google. Please check your internet connection and try again.'
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 150);

    // Validate inputs
    if (!email || !password) {
      showError('Missing Information', 'Please enter both email and password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await signIn(
        email.trim().toLowerCase(),
        password
      );
      
      if (!result.error) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        showSuccess(
          '🎉 Welcome Back!',
          'Successfully signed in! Start promoting your videos and earning coins.'
        );
        
        // Navigation will be handled by useEffect when profile loads
      } else {
        showError(
          'Sign In Failed',
          result.error || 'Unable to sign in. Please try again.'
        );
      }
    } catch (error) {
      console.error('Email Sign In Error:', error);
      showError(
        'Connection Error',
        'Unable to sign in. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showError('Email Required', 'Please enter your email address first');
      return;
    }

    try {
      const emailAuthService = EmailAuthService.getInstance();
      const result = await emailAuthService.resetPassword(email.trim().toLowerCase());
      
      if (result.success) {
        showInfo(
          '📧 Reset Email Sent',
          result.error || 'Please check your email for password reset instructions'
        );
      } else {
        showError(
          'Reset Failed',
          result.error || 'Unable to send reset email. Please try again.'
        );
      }
    } catch (error) {
      showError(
        'Connection Error',
        'Unable to send reset email. Please check your internet connection and try again.'
      );
    }
  };
  
  const toggleReferralInput = () => {
    setShowReferralInput(!showReferralInput);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Animated styles - moved to avoid render-time calculations
  const animatedButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: buttonScale.value }],
    };
  }, []);
  
  const sparkleAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${sparkleRotation.value}deg` }],
    };
  }, []);
  
  const glowAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: glowOpacity.value,
    };
  }, []);
  
  const slideAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(
      slideAnimation.value,
      [0, 1],
      [50, 0]
    );
    const opacity = interpolate(
      slideAnimation.value,
      [0, 1],
      [0, 1]
    );
    return {
      transform: [{ translateY }],
      opacity,
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={isDark 
          ? ['#0F0F23', '#1A1A2E', '#16213E', '#0F3460'] 
          : ['#667eea', '#764ba2', '#f093fb', '#f5576c']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <Animated.View style={[styles.header, slideAnimatedStyle]}>
            <Text style={[styles.title, { color: 'white' }]}>
              Welcome to VidGro
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)' }]}>
              Promote your YouTube videos and go viral on YouTube
            </Text>
          </Animated.View>

          {/* Development Mode Banner */}
          {__DEV__ && Platform.OS !== 'web' && (
            <View style={[styles.devBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
              <Text style={[styles.devBannerText, { color: colors.warning }]}>
                🚧 Development Mode: Google Sign-In requires production build. Use email sign-in for testing.
              </Text>
            </View>
          )}

          {/* Main Content */}
          <Animated.View style={[styles.content, slideAnimatedStyle]}>
            {/* Benefits Section */}
            <View style={[styles.benefitsContainer, { backgroundColor: colors.surface + '95' }]}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.success + '20' }]}>
                  <Gift size={isVerySmallScreen ? 18 : 20} color={colors.success} />
                </View>
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Watch videos, earn coins, promote yours
                </Text>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Users size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
                </View>
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Invite friends and earn 400 coins each
                </Text>
              </View>
            </View>

            {/* Authentication Options */}
            <View style={styles.authOptionsContainer}>
              {/* Email/Password Toggle */}
              <TouchableOpacity
                style={[styles.authToggle, { backgroundColor: colors.surface }]}
                onPress={() => setShowEmailForm(!showEmailForm)}
                activeOpacity={0.8}
              >
                <Mail size={20} color={colors.primary} />
                <Text style={[styles.authToggleText, { color: colors.text }]}>
                  {showEmailForm ? 'Hide Email Sign In' : 'Sign In with Email'}
                </Text>
              </TouchableOpacity>

              {/* Email Form */}
              {showEmailForm && (
                <Animated.View style={[styles.emailFormContainer, slideAnimatedStyle]}>
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Mail size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      style={[
                        styles.emailInput,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border
                        }
                      ]}
                      placeholder="Email address"
                      placeholderTextColor={colors.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Lock size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      style={[
                        styles.emailInput,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border
                        }
                      ]}
                      placeholder="Password"
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Email Sign In Button */}
                  <TouchableOpacity
                    style={[
                      styles.emailSignInButton,
                      { backgroundColor: colors.primary },
                      loading && styles.buttonDisabled
                    ]}
                    onPress={handleEmailSignIn}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <LogIn size={20} color="white" />
                    )}
                    <Text style={styles.emailSignInButtonText}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>

                  {/* Forgot Password Link */}
                  <TouchableOpacity
                    style={styles.forgotPasswordLink}
                    onPress={handleForgotPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  {/* Sign Up Link */}
                  <TouchableOpacity
                    style={styles.signUpLink}
                    onPress={() => router.push('/(auth)/signup')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.signUpLinkText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      Don't have an account? <Text style={{ color: 'white', fontWeight: 'bold' }}>Sign Up</Text>
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>

            {/* Referral Code Section */}
            {!showEmailForm && (
              <View style={styles.referralSection}>
                <TouchableOpacity
                  style={[styles.referralToggle, { backgroundColor: colors.surface }]}
                  onPress={toggleReferralInput}
                  activeOpacity={0.8}
                >
                  <Gift size={20} color={colors.primary} />
                  <Text style={[styles.referralToggleText, { color: colors.text }]}>
                    Have a referral code?
                  </Text>
                  <Text style={[styles.referralBonusText, { color: colors.success }]}>
                    +400 coins
                  </Text>
                </TouchableOpacity>
                
                {showReferralInput && (
                  <Animated.View style={[styles.referralInputContainer, slideAnimatedStyle]}>
                    <TextInput
                      style={[
                        styles.referralInput,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border
                        }
                      ]}
                      placeholder="Enter referral code (optional)"
                      placeholderTextColor={colors.textSecondary}
                      value={referralCode}
                      onChangeText={setReferralCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={10}
                    />
                  </Animated.View>
                )}
              </View>
            )}

            {/* Google Sign In Button */}
            <AnimatedTouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  borderColor: colors.border
                },
                googleLoading && styles.buttonDisabled,
                animatedButtonStyle
              ]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(66, 133, 244, 0.1)', 'rgba(52, 168, 83, 0.1)']
                  : ['rgba(66, 133, 244, 0.05)', 'rgba(52, 168, 83, 0.05)']
                }
                style={styles.googleButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <LogIn size={isVerySmallScreen ? 20 : 24} color={colors.primary} />
                )}
                <Text style={[styles.googleButtonText, { color: colors.text }]}>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 60,
    paddingVertical: 80,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 40 : 50,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: isVerySmallScreen ? 24 : 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: isVerySmallScreen ? 100 : 120,
    height: isVerySmallScreen ? 100 : 120,
    borderRadius: isVerySmallScreen ? 50 : 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 0,
  },
  logoIcon: {
    width: isVerySmallScreen ? 80 : 96,
    height: isVerySmallScreen ? 80 : 96,
    borderRadius: isVerySmallScreen ? 40 : 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkle: {
    position: 'absolute',
    top: isVerySmallScreen ? -8 : -10,
    right: isVerySmallScreen ? -8 : -10,
  },
  title: {
    fontSize: isVerySmallScreen ? 28 : isSmallScreen ? 32 : 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isVerySmallScreen ? 8 : 12,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 20 : 24,
    paddingHorizontal: isVerySmallScreen ? 10 : 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    maxWidth: isTablet ? 400 : '100%',
    width: '100%',
  },
  benefitsContainer: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 20 : 24,
    marginBottom: isVerySmallScreen ? 24 : 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: isVerySmallScreen ? 12 : 16,
  },
  benefitIcon: {
    width: isVerySmallScreen ? 40 : 44,
    height: isVerySmallScreen ? 40 : 44,
    borderRadius: isVerySmallScreen ? 20 : 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: isVerySmallScreen ? 20 : 22,
  },
  referralSection: {
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 16 : 20,
    borderRadius: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  referralToggleText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    flex: 1,
  },
  referralBonusText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: 'bold',
  },
  referralInputContainer: {
    marginTop: isVerySmallScreen ? 12 : 16,
  },
  referralInput: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 14 : 16,
    fontSize: isVerySmallScreen ? 14 : 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButton: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    marginBottom: isVerySmallScreen ? 24 : 32,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  googleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    gap: isVerySmallScreen ? 12 : 16,
  },
  googleButtonText: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 20 : 32,
  },
  footerText: {
    fontSize: isVerySmallScreen ? 12 : 13,
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 18,
    opacity: 0.8,
  },
  authOptionsContainer: {
    marginBottom: isVerySmallScreen ? 20 : 24,
  },
  authToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 16 : 20,
    borderRadius: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authToggleText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    flex: 1,
  },
  emailFormContainer: {
    marginTop: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
    borderRadius: isVerySmallScreen ? 12 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emailInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emailSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  emailSignInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  forgotPasswordLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signUpLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  signUpLinkText: {
    fontSize: 14,
    textAlign: 'center',
  },
  devBanner: {
    marginHorizontal: isVerySmallScreen ? 20 : 24,
    marginBottom: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 8 : 12,
    borderWidth: 1,
  },
  devBannerText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 18,
  },
});