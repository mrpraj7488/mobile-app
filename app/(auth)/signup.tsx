import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Gift } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useNotification();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !username || !password || !confirmPassword) {
      console.log('🚨 DEBUG: Calling showError for empty fields in signup');
      showError('Missing Information', 'Please fill in all required fields to create your account');
      return;
    }

    // Minimal email validation - just check for @ symbol
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      showError('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      showError('Password Mismatch', 'Passwords do not match. Please try again');
      return;
    }

    if (password.length < 6) {
      showError('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process...');
      const { error } = await signUp(trimmedEmail, password, username.trim(), referralCode.trim() || null);

      if (error) {
        console.log('Signup error details:', error);
        
        // Simplified error handling
        if (error.message.includes('already registered')) {
          showError('Account Exists', 'An account with this email already exists. Please try logging in instead.');
        } else if (error.message.includes('Database error')) {
          showSuccess('Signup Successful', 'Your account has been created! Please try logging in now.');
        } else {
          showError('Signup Error', 'Failed to create account. Please try again.');
        }
      } else {
        console.log('Signup completed successfully');
        const successMessage = referralCode.trim() 
          ? 'Your account has been created successfully! You received 200 bonus coins for using a referral code. You can now start watching videos and earning more coins!'
          : 'Your account has been created successfully. You can now start watching videos and earning coins!';
        
        showSuccess('Account Created!', successMessage);
        setTimeout(() => router.replace('/(tabs)'), 2000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      showError('Error', 'Something went wrong during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B', '#334155'] : ['#800080', '#FF4757']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Join VidGro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start earning by watching videos</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { paddingRight: 50, backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Referral Code (Optional) - Get 200 bonus coins!"
                placeholderTextColor={colors.textSecondary}
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                maxLength={20}
              />
              <View style={styles.referralIcon}>
                <Gift size={20} color={referralCode.trim() ? colors.accent : colors.textSecondary} />
              </View>
            </View>
            {referralCode.trim() && (
              <Text style={[styles.referralHint, { color: colors.success }]}>
                🎁 You'll receive 200 bonus coins when you sign up!
              </Text>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { paddingRight: 50, backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { paddingRight: 50, backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.loginLink, { color: colors.accent }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  referralIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  referralHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});