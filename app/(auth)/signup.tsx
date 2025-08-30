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
import { UserPlus, Mail, Lock, User, ArrowLeft, Gift } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import EmailAuthService from '../../services/EmailAuthService';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isVerySmallScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const { user, profile, loading: authLoading, signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showInfo } = useNotification();
  const router = useRouter();
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const slideAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Redirect if already logged in
    if (user && profile && !authLoading) {
      router.replace('/(tabs)');
    }
    
    slideAnimation.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, [user, profile, authLoading]);

  const handleEmailSignUp = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 150);
    
    // Validate inputs
    if (!email || !password || !confirmPassword || !username) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      showError('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    if (username.length < 3) {
      showError('Invalid Username', 'Username must be at least 3 characters long');
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
      const result = await signUp(
        email.trim().toLowerCase(),
        password,
        username.trim(),
        referralCode.trim() || undefined
      );
      
      if (!result.error) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        if (referralCode.trim()) {
          showSuccess(
            '🎉 Welcome to VidGro!',
            'Account created successfully! You and your referrer have both earned 400 coins as a welcome bonus.'
          );
        } else {
          showSuccess(
            '🎉 Welcome to VidGro!',
            'Account created successfully! Start promoting your videos and earning coins.'
          );
        }
        
        // Redirect to main app after successful signup
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        showError(
          'Sign Up Failed',
          result.error || 'Unable to create account. Please try again.'
        );
      }
    } catch (error) {
      console.error('Email Sign Up Error:', error);
      showError(
        'Connection Error',
        'Unable to create account. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const toggleReferralInput = () => {
    setShowReferralInput(!showReferralInput);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Animated styles
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  const slideAnimatedStyle = useAnimatedStyle(() => {
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
  });

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: 'white' }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)' }]}>
              Join VidGro and start earning coins
            </Text>
          </Animated.View>

          {/* Main Content */}
          <Animated.View style={[styles.content, slideAnimatedStyle]}>
            {/* Form Section */}
            <View style={[styles.formContainer, { backgroundColor: colors.surface + '95' }]}>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                  <User size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  placeholder="Username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Mail size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
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

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Lock size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Lock size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Referral Code Section */}
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

            {/* Sign Up Button */}
            <AnimatedTouchableOpacity
              style={[
                styles.signUpButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.shadowColor,
                },
                loading && styles.buttonDisabled,
                animatedButtonStyle
              ]}
              onPress={handleEmailSignUp}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(108, 92, 231, 0.9)', 'rgba(78, 56, 216, 0.9)']
                  : ['rgba(108, 92, 231, 1)', 'rgba(78, 56, 216, 1)']
                }
                style={styles.signUpButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <UserPlus size={isVerySmallScreen ? 20 : 24} color="white" />
                )}
                <Text style={styles.signUpButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.signInLinkText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                Already have an account? <Text style={{ color: 'white', fontWeight: 'bold' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
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
    marginBottom: isVerySmallScreen ? 30 : 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  formContainer: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 20 : 24,
    marginBottom: isVerySmallScreen ? 20 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
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
  referralSection: {
    marginBottom: isVerySmallScreen ? 20 : 24,
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
  signUpButton: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    marginBottom: isVerySmallScreen ? 20 : 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  signUpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    gap: isVerySmallScreen ? 12 : 16,
  },
  signUpButtonText: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signInLinkText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 20 : 32,
    marginTop: 20,
  },
  footerText: {
    fontSize: isVerySmallScreen ? 12 : 13,
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 18,
    opacity: 0.8,
  },
});
