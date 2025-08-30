import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useAlert } from '@/contexts/AlertContext';
import { getSupabase, createVideoPromotion } from '@/lib/supabase';
import { useConfig } from '@/contexts/ConfigContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { validateYouTubeUrl, validateVideoTitle, extractYouTubeVideoId } from '../../utils/validation';
import VideoPreview from '@/components/VideoPreview';
import GlobalHeader from '@/components/GlobalHeader';
import { Play, Eye, Clock, Crown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetwork } from '../../services/NetworkHandler';

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { config } = useConfig();
  const coinsEnabled = useFeatureFlag('coinsEnabled');
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const [menuVisible, setMenuVisible] = useState(false);
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [targetViews, setTargetViews] = useState(50);
  const [videoDuration, setVideoDuration] = useState(30);
  const [isValidVideo, setIsValidVideo] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fixed reward calculation logic based on duration
  const calculateCoinsByDuration = (durationSeconds: number): number => {
    if (durationSeconds >= 540) return 200;
    if (durationSeconds >= 480) return 150;
    if (durationSeconds >= 420) return 130;
    if (durationSeconds >= 360) return 100;
    if (durationSeconds >= 300) return 90;
    if (durationSeconds >= 240) return 70;
    if (durationSeconds >= 180) return 55;
    if (durationSeconds >= 150) return 50;
    if (durationSeconds >= 120) return 45;
    if (durationSeconds >= 90) return 35;
    if (durationSeconds >= 60) return 25;
    if (durationSeconds >= 45) return 15;
    if (durationSeconds >= 30) return 10;
    return 5;
  };

  // Improved cost calculation with higher charges
  const calculateCost = () => {
    // Higher cost calculation: base cost increased significantly
    const baseCost = Math.ceil((targetViews * videoDuration) / 50 * 8); // Doubled the multiplier and halved the divisor
    return profile?.is_vip ? Math.ceil(baseCost * 0.9) : baseCost;
  };

  const getVipDiscount = () => {
    if (!profile?.is_vip) return 0;
    const baseCost = Math.ceil((targetViews * videoDuration) / 50 * 8);
    return Math.ceil(baseCost * 0.1);
  };

  const handleVideoValidation = (isValid: boolean, title?: string, extractedVideoId?: string) => {
    setIsValidVideo(isValid);
    if (title) {
      setVideoTitle(title);
    }
    if (extractedVideoId) {
      setVideoId(extractedVideoId);
    }
  };

  const handleTitleDetected = (detectedTitle: string) => {
    setVideoTitle(detectedTitle);
  };

  const handlePromoteVideo = async () => {
    if (!user || !profile) {
      showError('Error', 'Please log in to promote videos');
      return;
    }

    // Check if coins feature is enabled
    if (!coinsEnabled) {
      showError('Feature Unavailable', 'Video promotion is currently disabled.');
      return;
    }

    const urlValidation = validateYouTubeUrl(youtubeUrl);
    if (!urlValidation.isValid) {
      showError('Invalid URL', urlValidation.error || 'Please enter a valid YouTube URL');
      return;
    }

    const titleValidation = validateVideoTitle(videoTitle);
    if (!titleValidation.isValid) {
      showError('Invalid Title', titleValidation.error || 'Please enter a valid video title');
      return;
    }

    if (!isValidVideo) {
      showError('Video Not Ready', 'Please wait for video validation to complete');
      return;
    }

    const extractedVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!extractedVideoId) {
      showError('Invalid URL', 'Could not extract video ID from URL');
      return;
    }

    const cost = calculateCost();
    if (profile.coins < cost) {
      showConfirm(
        'Insufficient Coins',
        `You need ${cost} coins to promote this video. You currently have ${profile.coins} coins.`,
        () => router.push('/buy-coins'),
        undefined,
        'Buy Coins',
        'Cancel'
      );
      return;
    }

    setLoading(true);

    try {
      // Calculate coin reward based on duration
      const coinReward = calculateCoinsByDuration(videoDuration);
      const coinCost = calculateCost();
      
      // Use the new createVideoPromotion function with correct parameters
      const result = await createVideoPromotion(
        coinCost,
        coinReward,
        videoDuration,
        targetViews,
        videoTitle,
        user.id,
        videoId  // Use videoId instead of youtubeUrl
      );

       // Debug log

      if (result.error) {
        let errorMsg = 'Failed to promote video. Please try again.';
        if (typeof result.error === 'string') {
          errorMsg = result.error;
        } else if (result.error && typeof result.error === 'object' && result.error.message) {
          errorMsg = result.error.message;
        } else if (result.error && typeof result.error === 'object') {
          errorMsg = String(result.error);
        }
        showError('Error', errorMsg);
        return;
      }

      // Check for success in data object (based on logs showing result.data.success)
      if (result.data?.success) {
        await refreshProfile();
        const vipDiscount = getVipDiscount();
        const discountText = vipDiscount > 0 ? `\n\n👑 VIP Discount Applied: ${vipDiscount} coins saved!` : '';
        showSuccess(
          'Video Promoted Successfully!',
          `Your video "${videoTitle}" has been submitted for promotion. It will be active in the queue after 10-minute hold period.${discountText}`
        );
        resetForm();
        setTimeout(() => router.push('/(tabs)/analytics'), 1500);
      } else {
        showError('Error', 'Failed to promote video. Please try again.');
      }
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

  const resetForm = () => {
    setYoutubeUrl('');
    setVideoTitle('');
    setIsValidVideo(false);
  };

  const targetViewsOptions = [35, 50, 100, 200, 300, 400, 500, 750, 1000];
  const durationOptions = [30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540];

  const cost = calculateCost();
  const vipDiscount = getVipDiscount();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="Promote" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>YouTube Video URL</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={colors.textSecondary}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {youtubeUrl && (
            <VideoPreview
              youtubeUrl={youtubeUrl}
              onValidation={handleVideoValidation}
              onTitleDetected={handleTitleDetected}
              collapsed={false}
            />
          )}

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Video Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter video title"
              placeholderTextColor={colors.textSecondary}
              value={videoTitle}
              onChangeText={setVideoTitle}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Target Views</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {targetViewsOptions.map((views) => (
                <TouchableOpacity
                  key={views}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    targetViews === views && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setTargetViews(views)}><Eye size={16} color={targetViews === views ? 'white' : colors.primary} /><Text style={[
                    styles.optionText,
                    { color: targetViews === views ? 'white' : colors.primary }
                  ]}>{views}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Video Duration (seconds)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {durationOptions.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    videoDuration === duration && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setVideoDuration(duration)}><Clock size={16} color={videoDuration === duration ? 'white' : colors.primary} /><Text style={[
                    styles.optionText,
                    { color: videoDuration === duration ? 'white' : colors.primary }
                  ]}>{duration}s</Text></TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.costSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.costTitle, { color: colors.text }]}>Promotion Summary</Text>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Target Views:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>{targetViews}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Duration:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>{videoDuration}s</Text>
            </View>
            {vipDiscount > 0 && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Base Cost:</Text>
                <Text style={[styles.costValue, { color: colors.text }]}>🪙{Math.ceil((targetViews * videoDuration) / 50 * 8)}</Text>
              </View>
            )}
            {vipDiscount > 0 && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.textSecondary }]}>👑 VIP Discount (10%):</Text>
                <Text style={[styles.vipDiscountValue, { color: colors.success }]}>-🪙{vipDiscount}</Text>
              </View>
            )}
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Final Cost:</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>🪙{cost}</Text>
            </View>
            {profile?.is_vip && (
              <View style={[styles.vipDiscount, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFF8E1' }]}>
                <Text style={[styles.vipDiscountText, { color: isDark ? colors.warning : '#F57C00' }]}>👑 VIP 10% Discount Applied</Text>
              </View>
            )}
            {!profile?.is_vip && (
              <TouchableOpacity
                style={[styles.vipUpgrade, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFF8E1' }]}
                onPress={() => router.push('/become-vip')}><Crown size={16} color="#FFD700" /><Text style={[styles.vipUpgradeText, { color: isDark ? colors.warning : '#F57C00' }]}>Upgrade to VIP and save 🪙{Math.ceil((targetViews * videoDuration) / 50 * 8 * 0.1)} on this promotion</Text></TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.promoteButton,
              { backgroundColor: colors.primary },
              (!isValidVideo || loading) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!isValidVideo || loading}>{loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Play size={20} color="white" />
            )}<Text style={styles.promoteButtonText}>{loading ? 'Promoting...' : 'Promote Video'}</Text></TouchableOpacity>

          <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              1. Enter your YouTube video URL{'\n'}
              2. Set your target views and duration{'\n'}
              3. Pay with coins to promote your video (reward varies by duration){'\n'}
              4. Your video enters a 10-minute hold period{'\n'}
              5. After hold, your video goes live in the queue{'\n'}
              6. Users watch and earn coins based on video duration!
              {'\n'}7. 👑 VIP members get 10% discount on all promotions
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsScroll: {
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  costSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 16,
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  vipDiscountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ECC71',
  },
  vipDiscount: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  vipDiscountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  vipUpgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  vipUpgradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    flex: 1,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  promoteButtonDisabled: {
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});