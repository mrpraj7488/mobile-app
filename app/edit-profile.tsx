import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import GlobalHeader from '@/components/GlobalHeader';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Mail, CreditCard as Edit3, Save, Camera, Lock, Eye, EyeOff, Crown, Coins, Calendar, Hash } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTinyScreen = screenWidth < 320;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showSuccess: showNotificationSuccess, showError: showNotificationError, showInfo } = useNotification();
  const router = useRouter();
  
  // Add safety checks for profile data
  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading profile...</Text>
      </View>
    );
  }
  
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || null);

  // Animation values
  const saveButtonScale = useSharedValue(1);
  const avatarScale = useSharedValue(1);
  const cardScale = useSharedValue(0.95);
  const fadeIn = useSharedValue(0);

  React.useEffect(() => {
    // Entrance animations with delay to avoid useInsertionEffect warning
    const timer = setTimeout(() => {
      cardScale.value = withTiming(1, { duration: 600 });
      fadeIn.value = withTiming(1, { duration: 800 });
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      showNotificationError('Validation Error', 'Username cannot be empty');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    saveButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);

    try {
      // Validate user exists
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Refresh profile data
      await refreshProfile();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showNotificationSuccess('Profile Updated', 'Your profile changes have been saved successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotificationError('Update Failed', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotificationError('Validation Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotificationError('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showNotificationError('Validation Error', 'New password must be at least 6 characters');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setPasswordLoading(true);

    try {
      // Validate email exists
      if (!profile?.email) {
        throw new Error('Email not found in profile');
      }
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });

      if (signInError) {
        showNotificationError('Authentication Error', 'Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showNotificationSuccess('Password Updated', 'Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error changing password:', error);
      showNotificationError('Password Update Failed', 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    avatarScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    // Simply open gallery directly without popup
    pickImage('gallery');
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showNotificationError('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showNotificationError('Permission Required', 'Gallery permission is required to select photos.');
          return;
        }
      }

      // Launch image picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: false,
          });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showNotificationError('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!user) return;

    setAvatarUploading(true);

    try {
      // Read the image file
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Store old avatar URL for cleanup
      const oldAvatarUrl = profile?.avatar_url;
      let oldAvatarPath: string | null = null;

      // Extract old avatar path from URL if exists
      if (oldAvatarUrl && oldAvatarUrl.includes('vidgro-files')) {
        try {
          const url = new URL(oldAvatarUrl);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/vidgro-files\/(.+)$/);
          if (pathMatch) {
            oldAvatarPath = pathMatch[1];
          }
        } catch (urlError) {
          console.log('Could not parse old avatar URL for cleanup:', urlError);
        }
      }

      // Create organized file structure
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `avatar_${user.id}_${timestamp}.${fileExt}`;
      const filePath = `User-files/avatars/${user.id}/${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer for upload
      const binaryString = atob(base64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase storage with organized structure
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vidgro-files')
        .upload(filePath, uint8Array, {
          contentType: `image/${fileExt}`,
          upsert: true,
          cacheControl: '3600',
          metadata: {
            userId: user.id,
            fileType: 'avatar',
            uploadedAt: new Date().toISOString(),
            originalName: `avatar.${fileExt}`
          }
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL from new bucket
      const { data: urlData } = supabase.storage
        .from('vidgro-files')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Delete old avatar file if it exists and upload was successful
      if (oldAvatarPath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('vidgro-files')
            .remove([oldAvatarPath]);
          
          if (deleteError) {
            console.warn('Failed to delete old avatar file:', deleteError);
            // Don't throw error - new avatar upload was successful
          } else {
            console.log('Successfully deleted old avatar file:', oldAvatarPath);
          }
        } catch (deleteError) {
          console.warn('Error during old avatar cleanup:', deleteError);
          // Don't throw error - new avatar upload was successful
        }
      }

      // Refresh profile data
      await refreshProfile();
      
      showNotificationSuccess('Profile Picture Updated', 'Your avatar has been successfully updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotificationError('Upload Failed', 'Failed to upload profile picture. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: fadeIn.value,
  }));

  const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'light-content'} 
        backgroundColor={isDark ? colors.headerBackground : '#800080'}
      />
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isVerySmallScreen ? 18 : 22 }]}>
            Edit Profile
          </Text>
          <View style={styles.headerButton}>
            <Edit3 size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color="white" />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Avatar Section */}
          <Animated.View style={[styles.avatarSection, { backgroundColor: colors.surface }, cardAnimatedStyle]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarHeader}>
                <Text style={[styles.avatarSectionTitle, { color: colors.text }]}>
                  👤 Profile Picture
                </Text>
              </View>
              
            <AnimatedTouchableOpacity
              style={[
                styles.avatarContainer,
                { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.25)' : 'rgba(128, 0, 128, 0.25)' },
                avatarAnimatedStyle
              ]}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              disabled={avatarUploading}
            >
              {avatarUploading ? (
                <ActivityIndicator size="large" color="white" />
              ) : avatarUri ? (
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <User size={isTinyScreen ? 32 : isVerySmallScreen ? 40 : 48} color="white" />
              )}
              <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                <Camera size={isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14} color="white" />
              </View>
            </AnimatedTouchableOpacity>
              <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>
                {avatarUploading ? 'Uploading...' : 'Tap to change profile picture'}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Basic Information */}
          <Animated.View style={[styles.section, { backgroundColor: colors.surface }, cardAnimatedStyle]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.08)', 'rgba(74, 144, 226, 0.03)'] : ['rgba(128, 0, 128, 0.08)', 'rgba(128, 0, 128, 0.03)']}
              style={styles.sectionGradient}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                👤 Basic Information
              </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
              <View style={styles.inputContainer}>
                <User size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.primary} />
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border,
                      fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                    }
                  ]}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                <TextInput
                  style={[
                    styles.input,
                    styles.disabledInput,
                    { 
                      backgroundColor: colors.border + '30',
                      color: colors.textSecondary,
                      borderColor: colors.border,
                      fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                    }
                  ]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  editable={false}
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Email cannot be changed for security reasons
              </Text>
            </View>

              <AnimatedTouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  loading && styles.buttonDisabled,
                  saveButtonAnimatedStyle
                ]}
                onPress={handleSaveProfile}
                disabled={loading}
                activeOpacity={0.8}
              >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Save size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color="white" />
              )}
                <Text style={[styles.saveButtonText, { fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16 }]}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </AnimatedTouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Password Section */}
          <Animated.View style={[styles.section, { backgroundColor: colors.surface }, cardAnimatedStyle]}>
            <LinearGradient
              colors={isDark ? ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.03)'] : ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.03)']}
              style={styles.sectionGradient}
            >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Lock size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  🔒 Change Password
                </Text>
              </View>
              <Text style={[styles.expandText, { color: colors.warning }]}>
                {showPasswordSection ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.warning} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textSecondary}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.warning} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.warning} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.passwordButton,
                    { backgroundColor: colors.warning },
                    passwordLoading && styles.buttonDisabled
                  ]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Lock size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color="white" />
                  )}
                  <Text style={[styles.passwordButtonText, { fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16 }]}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            </LinearGradient>
          </Animated.View>

          {/* Account Information */}
          <Animated.View style={[styles.section, { backgroundColor: colors.surface }, cardAnimatedStyle]}>
            <LinearGradient
              colors={isDark ? ['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.03)'] : ['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.03)']}
              style={styles.sectionGradient}
            >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Account Information
            </Text>

            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.1)' }]}>
                <View style={styles.infoCardHeader}>
                  <Coins size={isTinyScreen ? 14 : 16} color="#FFD700" />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Coins</Text>
                </View>
                <Text style={[styles.infoValue, { color: '#FFD700' }]}>
                  🪙{profile?.coins?.toLocaleString() || '0'}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(157, 78, 221, 0.15)' : 'rgba(157, 78, 221, 0.1)' }]}>
                <View style={styles.infoCardHeader}>
                  <Crown size={isTinyScreen ? 14 : 16} color="#9D4EDD" />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
                </View>
                <Text style={[
                  styles.infoValue, 
                  { color: profile?.is_vip ? '#9D4EDD' : colors.textSecondary }
                ]}>
                  {profile?.is_vip ? '👑 VIP' : 'Regular'}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.1)' }]}>
                <View style={styles.infoCardHeader}>
                  <Calendar size={isTinyScreen ? 14 : 16} color="#3498DB" />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Member</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Unknown'
                  }
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                <View style={styles.infoCardHeader}>
                  <Hash size={isTinyScreen ? 14 : 16} color="#10B981" />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Referral</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.accent }]}>
                  {profile?.referral_code || 'N/A'}
                </Text>
              </View>
            </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + (isTablet ? 20 : 16) : (isTablet ? 60 : 50),
    paddingBottom: isTinyScreen ? 10 : isVerySmallScreen ? 12 : isTablet ? 16 : 14,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : isTablet ? 24 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: isTinyScreen ? 36 : isVerySmallScreen ? 40 : isTablet ? 48 : 44,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: isTinyScreen ? 20 : 30,
  },

  // Avatar Section
  avatarSection: {
    margin: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  avatarGradient: {
    alignItems: 'center',
    paddingVertical: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  avatarHeader: {
    marginBottom: isTinyScreen ? 12 : 16,
  },
  avatarSectionTitle: {
    fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  avatarContainer: {
    width: isTinyScreen ? 64 : isVerySmallScreen ? 80 : 96,
    height: isTinyScreen ? 64 : isVerySmallScreen ? 80 : 96,
    borderRadius: isTinyScreen ? 32 : isVerySmallScreen ? 40 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: isTinyScreen ? 32 : isVerySmallScreen ? 40 : 48,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: isTinyScreen ? 2 : isVerySmallScreen ? 4 : 6,
    right: isTinyScreen ? 2 : isVerySmallScreen ? 4 : 6,
    width: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    height: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarLabel: {
    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Form Sections
  section: {
    margin: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sectionGradient: {
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  sectionTitle: {
    fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  expandText: {
    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  // Input Fields
  inputGroup: {
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  inputLabel: {
    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    paddingVertical: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    fontWeight: '500',
  },
  disabledInput: {
    opacity: 0.6,
  },
  passwordInput: {
    paddingRight: isTinyScreen ? 35 : isVerySmallScreen ? 40 : 45,
  },
  eyeButton: {
    position: 'absolute',
    right: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    padding: isTinyScreen ? 4 : 6,
  },
  helperText: {
    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12,
    marginTop: isTinyScreen ? 4 : 6,
    fontStyle: 'italic',
  },
  passwordContent: {
    marginTop: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
  },

  // Buttons
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    gap: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
    marginTop: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    gap: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
    marginTop: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  passwordButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Account Information Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  infoCard: {
    width: isTinyScreen 
      ? '48%' 
      : isVerySmallScreen 
        ? '48%'
        : '48%',
    minHeight: isTinyScreen ? 65 : isVerySmallScreen ? 70 : 75,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    padding: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 12,
    justifyContent: 'space-between',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 3 : 4,
    marginBottom: isTinyScreen ? 3 : 4,
  },
  infoLabel: {
    fontSize: isTinyScreen ? 8 : isVerySmallScreen ? 9 : 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoValue: {
    fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
  },
});