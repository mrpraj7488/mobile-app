import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Dimensions, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Copy, Gift, Users, Coins, Star, TrendingUp, Crown, Check } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { supabase } from '@/lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function ReferFriendScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [referralStats, setReferralStats] = useState({
    friendsReferred: 0,
    coinsEarned: 0
  });

  // Copy functionality
  const { copied: copiedCode, copyToClipboard: copyCode, opacity: codeSuccessOpacity } = useCopyToClipboard();
  const { copied: copiedLink, copyToClipboard: copyLink, opacity: linkSuccessOpacity } = useCopyToClipboard();

  // Animation values
  const buttonScale = useSharedValue(1);
  const statsScale = useSharedValue(1);

  const referralCode = profile?.referral_code || 'VIDGRO123';
  const referralLink = `https://vidgro.app/join?ref=${referralCode}`;

  // Fetch referral statistics
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (!profile?.id) return;

      try {
        // Get referral stats from the profile directly
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('total_referrals, referral_coins_earned')
          .eq('id', profile.id)
          .single();

        if (profileError) {
          console.error('Error fetching referral stats:', profileError);
          return;
        }

        setReferralStats({
          friendsReferred: profileData?.total_referrals || 0,
          coinsEarned: profileData?.referral_coins_earned || 0
        });
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      }
    };

    fetchReferralStats();

    // Set up real-time subscription for updates
    const subscription = supabase
      .channel('referral-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile?.id}`
        },
        () => {
          fetchReferralStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const handleCopyCode = async () => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    await copyCode(referralCode);
  };

  const handleCopyLink = async () => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    await copyLink(referralLink);
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await Share.share({
        message: `🎬 Join me on VidGro and start earning coins by watching videos! 💰\n\n🎯 Use my referral code: ${referralCode}\n🔗 Or click: ${referralLink}\n\n🎁 You'll get 200 bonus coins when you sign up!`,
        title: 'Join VidGro - Watch & Earn',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const benefits = [
    {
      icon: Coins,
      title: 'You Earn 500 Coins',
      description: 'Get 500 coins for each friend who joins and watches their first video',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA500']
    },
    {
      icon: Gift,
      title: 'Friend Gets 200 Coins',
      description: 'Your friend receives 200 bonus coins instantly when they sign up',
      color: '#2ECC71',
      gradient: ['#2ECC71', '#27AE60']
    },
    {
      icon: TrendingUp,
      title: 'Unlimited Referrals',
      description: 'No limits! Refer as many friends as you want and keep earning',
      color: '#3498DB',
      gradient: ['#3498DB', '#2980B9']
    }
  ];

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
  }));

  const codeSuccessAnimatedStyle = useAnimatedStyle(() => ({
    opacity: codeSuccessOpacity.value,
  }));

  const linkSuccessAnimatedStyle = useAnimatedStyle(() => ({
    opacity: linkSuccessOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={isDark ? ['#1E293B', '#334155'] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer Friends</Text>
          <Share2 size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        {/* Referral Stats - Moved to Top */}
        <Animated.View style={[styles.statsSection, statsAnimatedStyle]}>
          <View style={styles.statsHeader}>
            <Crown size={isVerySmallScreen ? 18 : 20} color={colors.accent} />
            <Text style={[styles.statsTitle, { color: colors.text }]}>Your Referral Stats</Text>
          </View>
          
          <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={isDark ? ['rgba(74, 144, 226, 0.2)', 'rgba(74, 144, 226, 0.1)'] : ['rgba(128, 0, 128, 0.2)', 'rgba(128, 0, 128, 0.1)']}
                style={styles.statGradient}
              >
                <Users size={isVerySmallScreen ? 20 : 24} color={colors.primary} />
                <Text style={[styles.statNumber, { color: colors.text }]}>{referralStats.friendsReferred}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Friends Referred</Text>
              </LinearGradient>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={isDark ? ['rgba(0, 212, 255, 0.2)', 'rgba(0, 212, 255, 0.1)'] : ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.statGradient}
              >
                <Coins size={isVerySmallScreen ? 20 : 24} color={colors.accent} />
                <Text style={[styles.statNumber, { color: colors.text }]}>{referralStats.coinsEarned}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coins Earned</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Your Referral Code</Text>
          <View style={[styles.codeContainer, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.codeGradient}
            >
              <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
              <View style={styles.copyButtonContainer}>
                <AnimatedTouchableOpacity 
                  style={[styles.copyButton, { backgroundColor: colors.primary + '20' }, buttonAnimatedStyle]} 
                  onPress={handleCopyCode}
                >
                  {copiedCode ? (
                    <Check size={isVerySmallScreen ? 16 : 18} color={colors.success} />
                  ) : (
                    <Copy size={isVerySmallScreen ? 16 : 18} color={colors.primary} />
                  )}
                </AnimatedTouchableOpacity>
                {copiedCode && (
                  <Animated.View style={[styles.successIndicator, codeSuccessAnimatedStyle]}>
                    <Text style={[styles.successText, { color: colors.success }]}>Copied!</Text>
                  </Animated.View>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Referral Link Section */}
        <View style={styles.linkSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔗 Your Referral Link</Text>
          <View style={[styles.linkContainer, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.linkGradient}
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
                {referralLink}
              </Text>
              <View style={styles.copyButtonContainer}>
                <AnimatedTouchableOpacity 
                  style={[styles.copyButton, { backgroundColor: colors.primary + '20' }, buttonAnimatedStyle]} 
                  onPress={handleCopyLink}
                >
                  {copiedLink ? (
                    <Check size={isVerySmallScreen ? 16 : 18} color={colors.success} />
                  ) : (
                    <Copy size={isVerySmallScreen ? 16 : 18} color={colors.primary} />
                  )}
                </AnimatedTouchableOpacity>
                {copiedLink && (
                  <Animated.View style={[styles.successIndicator, linkSuccessAnimatedStyle]}>
                    <Text style={[styles.successText, { color: colors.success }]}>Copied!</Text>
                  </Animated.View>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <LinearGradient
            colors={isDark ? ['#4A90E2', '#6366F1'] : ['#800080', '#800080']}
            style={styles.shareButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Share2 size={isVerySmallScreen ? 18 : 20} color="white" />
            <Text style={[styles.shareButtonText, { fontSize: isVerySmallScreen ? 14 : 16 }]}>
              Share with Friends
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Referral Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🎁 Referral Benefits</Text>
          
          <View style={[styles.benefitsGrid, isTablet && styles.benefitsGridTablet]}>
            {benefits.map((benefit, index) => (
              <View key={index} style={[
                styles.benefitCard, 
                { backgroundColor: colors.surface },
                isTablet && styles.benefitCardTablet
              ]}>
                <LinearGradient
                  colors={benefit.gradient}
                  style={styles.benefitIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <benefit.icon size={isVerySmallScreen ? 20 : 24} color="white" />
                </LinearGradient>
                
                <View style={styles.benefitContent}>
                  <Text style={[
                    styles.benefitTitle, 
                    { 
                      color: colors.text,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    {benefit.title}
                  </Text>
                  <Text style={[
                    styles.benefitDescription, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 11 : 13
                    }
                  ]}>
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={[styles.stepsSection, { backgroundColor: colors.surface }]}>
          <View style={styles.stepsHeader}>
            <Star size={isVerySmallScreen ? 18 : 20} color={colors.accent} />
            <Text style={[styles.stepsTitle, { color: colors.text }]}>How It Works</Text>
          </View>
          
          <View style={styles.stepsContainer}>
            {[
              { step: '1', text: 'Share your referral code or link', icon: Share2 },
              { step: '2', text: 'Friend signs up using your code', icon: Users },
              { step: '3', text: 'Friend watches their first video', icon: Gift },
              { step: '4', text: 'You both get bonus coins instantly!', icon: Coins }
            ].map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <item.icon size={isVerySmallScreen ? 14 : 16} color={colors.primary} />
                  <Text style={[
                    styles.stepText, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 12 : 14
                    }
                  ]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Success Stories */}
        <View style={[styles.successSection, { backgroundColor: colors.success + '15' }]}>
          <View style={styles.successHeader}>
            <TrendingUp size={isVerySmallScreen ? 18 : 20} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.success }]}>
              💫 Success Stories
            </Text>
          </View>
          
          <View style={styles.successStats}>
            <View style={styles.successStat}>
              <Text style={[styles.successNumber, { color: colors.success }]}>50K+</Text>
              <Text style={[styles.successLabel, { color: colors.success }]}>Active Referrers</Text>
            </View>
            <View style={styles.successStat}>
              <Text style={[styles.successNumber, { color: colors.success }]}>2.5M</Text>
              <Text style={[styles.successLabel, { color: colors.success }]}>Coins Earned</Text>
            </View>
            <View style={styles.successStat}>
              <Text style={[styles.successNumber, { color: colors.success }]}>95%</Text>
              <Text style={[styles.successLabel, { color: colors.success }]}>Success Rate</Text>
            </View>
          </View>
          
          <Text style={[styles.successStoryText, { color: colors.success }]}>
            "I've earned over 10,000 coins just by sharing VidGro with my friends!" - Top Referrer
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
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 18 : 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
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

  // Stats Section - Moved to Top
  statsSection: {
    margin: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
    gap: 8,
  },
  statsTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 10 : 12,
  },
  statsContainerTablet: {
    gap: 20,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statGradient: {
    alignItems: 'center',
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 6 : 8,
  },
  statNumber: {
    fontSize: isVerySmallScreen ? 24 : isTablet ? 36 : 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: isVerySmallScreen ? 10 : 12,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Code Section
  codeSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 8 : 12,
    letterSpacing: 0.3,
  },
  codeContainer: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  codeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 14 : 18,
    gap: isVerySmallScreen ? 8 : 12,
  },
  codeText: {
    flex: 1,
    fontSize: isVerySmallScreen ? 16 : 20,
    fontWeight: 'bold',
    letterSpacing: isVerySmallScreen ? 1 : 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: isVerySmallScreen ? 8 : 10,
    borderRadius: isVerySmallScreen ? 8 : 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  copyButtonContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  successIndicator: {
    position: 'absolute',
    top: -30,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  successText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },

  // Link Section
  linkSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  linkContainer: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  linkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 14 : 18,
    gap: isVerySmallScreen ? 8 : 12,
  },
  linkText: {
    flex: 1,
    fontSize: isVerySmallScreen ? 11 : 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Share Button
  shareButton: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 24,
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 14 : 18,
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    gap: isVerySmallScreen ? 8 : 10,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Benefits Section
  benefitsSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 24,
  },
  benefitsGrid: {
    gap: isVerySmallScreen ? 12 : 16,
  },
  benefitsGridTablet: {
    flexDirection: 'row',
    gap: 20,
  },
  benefitCard: {
    flexDirection: 'row',
    borderRadius: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 14 : 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  benefitCardTablet: {
    flex: 1,
    flexDirection: 'column',
    textAlign: 'center',
    paddingVertical: 24,
  },
  benefitIconContainer: {
    width: isVerySmallScreen ? 40 : isTablet ? 56 : 48,
    height: isVerySmallScreen ? 40 : isTablet ? 56 : 48,
    borderRadius: isVerySmallScreen ? 20 : isTablet ? 28 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet ? 0 : (isVerySmallScreen ? 12 : 16),
    marginBottom: isTablet ? 12 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  benefitContent: {
    flex: 1,
    alignItems: isTablet ? 'center' : 'flex-start',
  },
  benefitTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 2 : 4,
    textAlign: isTablet ? 'center' : 'left',
    letterSpacing: 0.3,
  },
  benefitDescription: {
    lineHeight: isVerySmallScreen ? 16 : 18,
    textAlign: isTablet ? 'center' : 'left',
  },

  // Steps Section
  stepsSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 24,
    borderRadius: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
    gap: 8,
  },
  stepsTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  stepsContainer: {
    gap: isVerySmallScreen ? 10 : 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isVerySmallScreen ? 10 : 12,
  },
  stepNumber: {
    width: isVerySmallScreen ? 24 : 28,
    height: isVerySmallScreen ? 24 : 28,
    borderRadius: isVerySmallScreen ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isVerySmallScreen ? 6 : 8,
  },
  stepText: {
    flex: 1,
    lineHeight: isVerySmallScreen ? 16 : 18,
    fontWeight: '500',
  },

  // Success Section
  successSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 32,
    borderRadius: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 16 : 20,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
    gap: 8,
  },
  successTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  successStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 12,
  },
  successStat: {
    alignItems: 'center',
  },
  successNumber: {
    fontSize: isVerySmallScreen ? 16 : 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  successLabel: {
    fontSize: isVerySmallScreen ? 9 : 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  successStoryText: {
    fontSize: isVerySmallScreen ? 11 : 13,
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 18,
    fontStyle: 'italic',
    paddingHorizontal: isVerySmallScreen ? 8 : 12,
  },
});

export default ReferFriendScreen;
