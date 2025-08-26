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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldOff, Clock, Play } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '@/services/NetworkHandler';

export default function ConfigureAdsScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showInfo } = useNotification();
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState(5);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [adFreeHours, setAdFreeHours] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adFreeOptions = [
    { hours: 1, watchAds: 2, description: 'Watch 2 ads for 1 hour ad-free' },
    { hours: 3, watchAds: 5, description: 'Watch 5 ads for 3 hours ad-free' },
    { hours: 5, watchAds: 8, description: 'Watch 8 ads for 5 hours ad-free' },
    { hours: 12, watchAds: 15, description: 'Watch 15 ads for 12 hours ad-free' },
    { hours: 24, watchAds: 25, description: 'Watch 25 ads for 24 hours ad-free' },
  ];

  // Load ad-free session on component mount
  useEffect(() => {
    loadAdFreeSession();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start countdown timer when ad-free session is active
  useEffect(() => {
    if (isAdFreeActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer expired
            endAdFreeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAdFreeActive]);

  const loadAdFreeSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('adFreeSession');
      if (sessionData) {
        const { endTime, hours } = JSON.parse(sessionData);
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        if (remaining > 0) {
          setIsAdFreeActive(true);
          setTimeRemaining(remaining);
          setAdFreeHours(hours);
        } else {
          // Session expired, clean up
          await AsyncStorage.removeItem('adFreeSession');
        }
      }
    } catch (error) {
      console.error('Error loading ad-free session:', error);
    }
  };

  const saveAdFreeSession = async (hours: number) => {
    try {
      const endTime = Date.now() + (hours * 60 * 60 * 1000);
      const sessionData = { endTime, hours };
      await AsyncStorage.setItem('adFreeSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving ad-free session:', error);
    }
  };

  const endAdFreeSession = async () => {
    try {
      await AsyncStorage.removeItem('adFreeSession');
      setIsAdFreeActive(false);
      setTimeRemaining(0);
      setAdFreeHours(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      showSuccess(
        'Ad-Free Session Expired',
        'Your ad-free time has ended. You can start a new session anytime!'
      );
      
      // Redirect back to main screen after a short delay
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error) {
      console.error('Error ending ad-free session:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleStartAdFreeSession = async () => {
    const option = adFreeOptions.find(opt => opt.hours === selectedOption);
    if (!option) return;

    setLoading(true);
    
    showInfo(
      'Watch Ads for Ad-Free Time',
      `You need to watch ${option.watchAds} ads to get ${option.hours} hours of ad-free experience.`
    );
    
    // Proceed with ad watching logic
    try {
        // Simulate ad watching
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setAdFreeHours(option.hours);
        setIsAdFreeActive(true);
        setTimeRemaining(option.hours * 60 * 60); // Convert hours to seconds
        await saveAdFreeSession(option.hours);
        
        showSuccess(
          'Ad-Free Session Started!',
          `You now have ${option.hours} hours of ad-free experience. Timer is now running!`
        );
      } catch (error) {
        showError('Failed to start ad-free session', 'Please try again.');
      } finally {
        setLoading(false);
      }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Configure Ads</Text>
          <ShieldOff size={24} color="white" />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isAdFreeActive ? (
          <View style={[styles.activeContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.activeIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
              <ShieldOff size={48} color="#2ECC71" />
            </View>
            <Text style={[styles.activeTitle, { color: colors.text }]}>Ad-Free Active</Text>
            <Text style={[styles.activeSubtitle, { color: colors.textSecondary }]}>
              You're currently enjoying an ad-free experience
            </Text>
            
            <View style={[styles.timerContainer, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(128, 0, 128, 0.1)' }]}>
              <Clock size={24} color={colors.primary} />
              <Text style={[styles.timerText, { color: colors.primary }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
            
            <Text style={[styles.timerSubtext, { color: colors.textSecondary }]}>
              Time remaining from your {adFreeHours} hour session
            </Text>
            
            <TouchableOpacity
              style={[styles.endSessionButton, { backgroundColor: colors.error }]}
              onPress={() => {
                showInfo(
                  'End Ad-Free Session',
                  'Your ad-free session has been ended early.'
                );
                setIsAdFreeActive(false);
                setAdFreeHours(0);
                setTimeRemaining(0);
                clearInterval(timerRef.current!);
                timerRef.current = null;
                AsyncStorage.removeItem('adFreeSession');
              }}
            >
              <Text style={[styles.endSessionText, { color: 'white' }]}>End Session Early</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose how many ads you want to watch to earn ad-free time
            </Text>

            <View style={styles.optionsContainer}>
              {adFreeOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedOption === option.hours && styles.selectedOption
                  ]}
                  onPress={() => setSelectedOption(option.hours)}
                >
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionHours, { color: colors.text }]}>{option.hours} Hours</Text>
                    <View style={[styles.adCount, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 0, 128, 0.2)' }]}>
                      <Play size={16} color={colors.primary} />
                      <Text style={[styles.adCountText, { color: colors.primary }]}>{option.watchAds} ads</Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
              onPress={handleStartAdFreeSession}
              disabled={loading}
            >
              <ShieldOff size={20} color="white" />
              <Text style={[styles.startButtonText, { color: 'white' }]}>
                {loading ? 'Starting...' : 'Start Ad-Free Session'}
              </Text>
            </TouchableOpacity>
            
            {!profile?.is_vip && (
              <TouchableOpacity
                style={styles.vipButton}
                onPress={() => router.push('/become-vip')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.vipButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.vipButtonContent}>
                    <View style={styles.vipButtonLeft}>
                      <ShieldOff size={18} color="#000" />
                      <Text style={styles.vipButtonText}>Upgrade to VIP</Text>
                    </View>
                    <Text style={styles.vipButtonBenefit}>Skip All Ads Forever</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>1</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Select ad-free hours</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>2</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Watch required ads</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>3</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Enjoy ad-free experience</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  activeContainer: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOption: {
    borderColor: '#9D4EDD',
    shadowColor: '#9D4EDD',
    shadowOpacity: 0.2,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionHours: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  adCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  adCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
  },
  startButton: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  vipButton: {
    marginTop: 12,
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  vipButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  vipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vipButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vipButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  vipButtonBenefit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    opacity: 0.8,
  },
  infoSteps: {
    gap: 12,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  endSessionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  endSessionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});