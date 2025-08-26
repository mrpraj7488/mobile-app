import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Send, Heart, TrendingUp, Users, ChevronLeft, Award, MessageSquare, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isVerySmallScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

export default function RateUsScreen() {
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useNotification();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonScale = useSharedValue(1);
  const starScales = Array.from({ length: 5 }, () => useSharedValue(1));

  const ratingLabels = [
    '', // 0 stars
    'Poor',
    'Fair', 
    'Good',
    'Very Good',
    'Excellent'
  ];

  const getRatingLabel = (rating: number) => {
    return ratingLabels[rating];
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showError('Rating Required', 'Please select a star rating before submitting');
      return;
    }

    setIsSubmitting(true);

    // Simulate rating submission
    setTimeout(() => {
      showSuccess(
        'Thank You!',
        `Thank you for your ${rating}-star rating! You've earned 100 coins as a reward for your feedback.`
      );
      setTimeout(() => {
        router.back();
      }, 2000);
      setIsSubmitting(false);
    }, 1500);
  };

  const handleStarPress = (index: number) => {
    setRating(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate the pressed star and ripple effect
    starScales[index - 1].value = withSequence(
      withSpring(1.4, { damping: 2, stiffness: 200 }),
      withSpring(1, { damping: 3, stiffness: 150 })
    );
    
    // Animate neighboring stars with delay
    if (index > 1) {
      setTimeout(() => {
        starScales[index - 2].value = withSequence(
          withSpring(1.2, { damping: 3, stiffness: 180 }),
          withSpring(1, { damping: 4, stiffness: 150 })
        );
      }, 50);
    }
    if (index < 5) {
      setTimeout(() => {
        starScales[index].value = withSequence(
          withSpring(1.2, { damping: 3, stiffness: 180 }),
          withSpring(1, { damping: 4, stiffness: 150 })
        );
      }, 50);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star, index) => {
      const animatedStarStyle = useAnimatedStyle(() => ({
        transform: [{ scale: starScales[index].value }],
      }));
      
      return (
        <Animated.View key={star} style={animatedStarStyle}>
          <TouchableOpacity
            style={styles.starButton}
            onPress={() => handleStarPress(star)}
            activeOpacity={0.7}
          >
            <Star
              size={isVerySmallScreen ? 32 : 36}
              color={star <= rating ? '#800080' : colors.border}
              fill={star <= rating ? '#800080' : 'transparent'}
            />
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#800080', '#9932CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isVerySmallScreen && styles.headerTitleSmall]}>Rate VidGro</Text>
          <View style={styles.headerIcon}>
            <Award size={24} color="white" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={isTablet && styles.tabletContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Rating Section */}
        <Animated.View style={[styles.ratingSection, { backgroundColor: colors.card }]}>
          <View style={styles.iconContainer}>
            <Award size={36} color="#800080" />
          </View>
          <Text style={[styles.ratingTitle, { color: colors.text }, isVerySmallScreen && styles.ratingTitleSmall]}>
            How's your experience?
          </Text>
          <Text style={[styles.ratingSubtitle, { color: colors.textSecondary }, isVerySmallScreen && styles.ratingSubtitleSmall]}>
            Your feedback helps us improve VidGro for everyone
          </Text>

          <View style={styles.starsContainer}>
            {renderStars()}
          </View>

          {rating > 0 && (
            <Animated.View style={styles.ratingLabelContainer}>
              <Sparkles size={16} color="#800080" />
              <Text style={[styles.ratingLabel, { color: '#800080' }]}>
                {getRatingLabel(rating)}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Feedback Section */}
        <Animated.View style={[styles.feedbackSection, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={20} color="#800080" />
            <Text style={[styles.feedbackTitle, { color: colors.text }, isVerySmallScreen && styles.feedbackTitleSmall]}>
              Tell us more (optional)
            </Text>
          </View>
          <TextInput
            style={[styles.feedbackInput, { 
              backgroundColor: colors.inputBackground, 
              color: colors.text, 
              borderColor: '#800080'
            }]}
            placeholder="What do you like most about VidGro? Any suggestions for improvement?"
            placeholderTextColor={colors.textSecondary}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Submit Button */}
        <Animated.View style={[styles.submitButton, animatedButtonStyle, rating === 0 && styles.buttonDisabled]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            activeOpacity={0.8}
            onPressIn={() => {
              buttonScale.value = withSpring(0.95);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1);
            }}
          >
            <LinearGradient
              colors={rating === 0 ? ['#808080', '#808080'] : ['#800080', '#9932CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              <Send size={20} color="white" />
              <Text style={[styles.submitButtonText, isVerySmallScreen && styles.submitButtonTextSmall]}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Benefits Section */}
        <Animated.View style={[styles.benefitsSection, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color="#800080" />
            <Text style={[styles.benefitsTitle, { color: colors.text }, isVerySmallScreen && styles.benefitsTitleSmall]}>
              Why Rate Us?
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(128, 0, 128, 0.1)' }]}>
              <Heart size={20} color="#800080" />
            </View>
            <Text style={[styles.benefitText, { color: colors.textSecondary }, isVerySmallScreen && styles.benefitTextSmall]}>
              Help us create a better experience
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(128, 0, 128, 0.1)' }]}>
              <TrendingUp size={20} color="#800080" />
            </View>
            <Text style={[styles.benefitText, { color: colors.textSecondary }, isVerySmallScreen && styles.benefitTextSmall]}>
              Shape future features and updates
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(128, 0, 128, 0.1)' }]}>
              <Users size={20} color="#800080" />
            </View>
            <Text style={[styles.benefitText, { color: colors.textSecondary }, isVerySmallScreen && styles.benefitTextSmall]}>
              Join our growing community
            </Text>
          </View>
        </Animated.View>

        {/* Store Links */}
        <Animated.View style={[styles.storeLinksSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.storeLinksTitle, { color: colors.text }, isVerySmallScreen && styles.storeLinksTitleSmall]}>
            Rate us on the stores
          </Text>
          <TouchableOpacity 
            style={[styles.storeButton, { 
              backgroundColor: colors.card, 
              borderColor: '#800080' 
            }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.storeButtonText, { color: colors.text }]}>📱 App Store</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.storeButton, { 
              backgroundColor: colors.card, 
              borderColor: '#800080' 
            }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.storeButtonText, { color: colors.text }]}>🤖 Google Play</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Thank You Message */}
        <Animated.View style={[styles.thankYouSection, { backgroundColor: colors.card, borderLeftColor: '#800080' }]}>
          <Text style={[styles.thankYouText, { color: colors.text }, isVerySmallScreen && styles.thankYouTextSmall]}>
            <Sparkles size={16} color="#800080" /> Thank you for being part of the VidGro community!
            Your support means everything to us.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 20 : 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  headerTitleSmall: {
    fontSize: 18,
  },
  headerIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: isVerySmallScreen ? 16 : 20,
  },
  tabletContent: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  ratingSection: {
    borderRadius: 20,
    padding: isVerySmallScreen ? 24 : 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.1)',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: isVerySmallScreen ? 22 : 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingTitleSmall: {
    fontSize: 20,
  },
  ratingSubtitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  ratingSubtitleSmall: {
    fontSize: 13,
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 6 : 8,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  ratingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(128, 0, 128, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingLabel: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  feedbackSection: {
    borderRadius: 20,
    padding: isVerySmallScreen ? 18 : 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  feedbackTitleSmall: {
    fontSize: 15,
  },
  feedbackInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: isVerySmallScreen ? 14 : 16,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#800080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 14 : 16,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 15 : 16,
    fontWeight: 'bold',
  },
  submitButtonTextSmall: {
    fontSize: 14,
  },
  benefitsSection: {
    borderRadius: 20,
    padding: isVerySmallScreen ? 18 : 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.1)',
  },
  benefitsTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  benefitsTitleSmall: {
    fontSize: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    flex: 1,
  },
  benefitTextSmall: {
    fontSize: 13,
  },
  storeLinksSection: {
    borderRadius: 20,
    padding: isVerySmallScreen ? 18 : 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.1)',
  },
  storeLinksTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  storeLinksTitleSmall: {
    fontSize: 15,
  },
  storeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  storeButtonText: {
    fontSize: isVerySmallScreen ? 15 : 16,
    fontWeight: '600',
  },
  thankYouSection: {
    borderRadius: 16,
    padding: isVerySmallScreen ? 18 : 20,
    marginBottom: 32,
    borderLeftWidth: 4,
  },
  thankYouText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  thankYouTextSmall: {
    fontSize: 13,
    lineHeight: 22,
  },
});