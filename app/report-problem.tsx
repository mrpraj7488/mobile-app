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
  FlatList,
  Animated,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { Search, Bug, Wifi, Play, Coins, Crown, Shield, RefreshCw, Smartphone, TriangleAlert as AlertTriangle, Send, ChevronRight, Clock, Database, Settings, Eye, Volume2 } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import * as Haptics from 'expo-haptics';
import BugReportService from '@/services/BugReportService';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

interface TechnicalIssue {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  category: 'critical' | 'common' | 'minor';
  keywords: string[];
}

export default function ReportProblemScreen() {
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showWarning } = useNotification();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    { id: 'all', title: 'All Issues', icon: Bug },
    { id: 'video', title: 'Videos', icon: Play },
    { id: 'coins', title: 'Coins', icon: Coins },
    { id: 'account', title: 'Account', icon: Crown },
    { id: 'ads', title: 'Ads', icon: Eye },
    { id: 'performance', title: 'Performance', icon: RefreshCw },
  ];

  const technicalIssues: TechnicalIssue[] = [
    // Critical Issues
    {
      id: 'app-crash',
      title: 'App Crashes or Freezes',
      description: 'VidGro app suddenly closes or becomes unresponsive',
      icon: AlertTriangle,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['crash', 'freeze', 'close', 'stop', 'exit', 'quit', 'unresponsive']
    },
    {
      id: 'login-failed',
      title: 'Cannot Sign In',
      description: 'Unable to access VidGro account with email/password',
      icon: Shield,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['login', 'signin', 'password', 'account', 'access', 'authentication']
    },
    {
      id: 'coins-missing',
      title: 'Purchased Coins Missing',
      description: 'Bought coins not appearing in VidGro balance',
      icon: Coins,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['coins', 'purchase', 'balance', 'missing', 'payment', 'buy']
    },

    // Video & Promotion Issues
    {
      id: 'video-not-loading',
      title: 'Videos Not Playing',
      description: 'Cannot watch videos to earn coins in VidGro',
      icon: Play,
      color: '#F39C12',
      category: 'common',
      keywords: ['video', 'play', 'load', 'stream', 'watch', 'earn']
    },
    {
      id: 'promotion-not-working',
      title: 'Video Promotion Failed',
      description: 'My video is not getting promoted after spending coins',
      icon: RefreshCw,
      color: '#F39C12',
      category: 'common',
      keywords: ['promotion', 'promote', 'views', 'boost', 'campaign', 'video']
    },
    {
      id: 'upload-failed',
      title: 'Cannot Upload Video',
      description: 'Unable to upload my video for promotion',
      icon: Database,
      color: '#F39C12',
      category: 'common',
      keywords: ['upload', 'video', 'file', 'submit', 'add', 'promote']
    },

    // Coin & Reward Issues
    {
      id: 'coins-not-earned',
      title: 'Not Earning Coins',
      description: 'Not receiving coins after watching ads in VidGro',
      icon: Coins,
      color: '#F39C12',
      category: 'common',
      keywords: ['coins', 'earn', 'reward', 'watch', 'ads', 'not receiving']
    },
    {
      id: 'referral-not-credited',
      title: 'Referral Bonus Missing',
      description: 'Did not receive 500 coins for friend referral',
      icon: Coins,
      color: '#F39C12',
      category: 'common',
      keywords: ['referral', 'bonus', 'coins', 'friend', 'invite', 'reward']
    },
    {
      id: 'daily-limit-wrong',
      title: 'Daily Limit Issue',
      description: 'Daily coin earning limit not working correctly',
      icon: Clock,
      color: '#3498DB',
      category: 'minor',
      keywords: ['daily', 'limit', 'coins', 'cap', 'maximum', 'earn']
    },

    // Account & VIP Issues
    {
      id: 'vip-not-active',
      title: 'VIP Status Not Active',
      description: 'Purchased VIP membership not showing as active',
      icon: Crown,
      color: '#800080',
      category: 'critical',
      keywords: ['vip', 'premium', 'membership', 'purchase', 'active', 'status']
    },
    {
      id: 'vip-benefits-missing',
      title: 'VIP Benefits Not Applied',
      description: 'Not receiving 2x coins or 50% discount on promotions',
      icon: Crown,
      color: '#800080',
      category: 'common',
      keywords: ['vip', 'benefits', 'discount', 'double', 'coins', 'promotion']
    },
    {
      id: 'profile-update-failed',
      title: 'Cannot Update Profile',
      description: 'Unable to change profile information or settings',
      icon: Settings,
      color: '#3498DB',
      category: 'minor',
      keywords: ['profile', 'update', 'settings', 'change', 'edit', 'save']
    },

    // Ad & Earning Issues
    {
      id: 'ads-not-loading',
      title: 'Ads Not Loading',
      description: 'Cannot watch ads to earn coins',
      icon: Eye,
      color: '#F39C12',
      category: 'common',
      keywords: ['ads', 'advertisement', 'loading', 'watch', 'earn', 'coins']
    },
    {
      id: 'ad-rewards-missing',
      title: 'Ad Rewards Not Given',
      description: 'Watched full ad but did not receive coins',
      icon: AlertTriangle,
      color: '#E74C3C',
      category: 'common',
      keywords: ['ad', 'reward', 'coins', 'watch', 'complete', 'missing']
    },
    {
      id: 'ad-stuck',
      title: 'Ad Stuck or Frozen',
      description: 'Advertisement freezes and cannot be closed',
      icon: Clock,
      color: '#F39C12',
      category: 'common',
      keywords: ['ad', 'stuck', 'freeze', 'frozen', 'close', 'exit']
    },

    // Performance & Technical Issues
    {
      id: 'app-slow',
      title: 'App Running Slowly',
      description: 'VidGro app is laggy or unresponsive',
      icon: Smartphone,
      color: '#F39C12',
      category: 'minor',
      keywords: ['slow', 'performance', 'lag', 'sluggish', 'speed', 'responsive']
    },
    {
      id: 'battery-drain',
      title: 'Excessive Battery Usage',
      description: 'VidGro draining battery faster than expected',
      icon: Settings,
      color: '#3498DB',
      category: 'minor',
      keywords: ['battery', 'drain', 'power', 'usage', 'consumption', 'energy']
    },
    {
      id: 'storage-full',
      title: 'Storage Issues',
      description: 'App taking too much storage space',
      icon: Database,
      color: '#3498DB',
      category: 'minor',
      keywords: ['storage', 'space', 'memory', 'cache', 'data', 'full']
    },

    // Payment & Purchase Issues
    {
      id: 'payment-failed',
      title: 'Payment Failed',
      description: 'Cannot complete coin or VIP purchase',
      icon: AlertTriangle,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['payment', 'purchase', 'buy', 'transaction', 'failed', 'error']
    },
    {
      id: 'wrong-charge',
      title: 'Incorrect Charge Amount',
      description: 'Charged wrong amount for coins or VIP',
      icon: Coins,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['charge', 'amount', 'wrong', 'incorrect', 'payment', 'price']
    },
    {
      id: 'refund-request',
      title: 'Need Refund',
      description: 'Request refund for accidental purchase',
      icon: RefreshCw,
      color: '#F39C12',
      category: 'common',
      keywords: ['refund', 'money', 'back', 'return', 'cancel', 'purchase']
    },
  ];

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const getFilteredIssues = () => {
    let filtered = technicalIssues;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(issue => {
        switch (selectedCategory) {
          case 'video': return issue.keywords.some(k => ['video', 'play', 'stream', 'watch', 'upload', 'promotion', 'promote'].includes(k));
          case 'coins': return issue.keywords.some(k => ['coins', 'earn', 'reward', 'payment', 'balance', 'referral', 'bonus'].includes(k));
          case 'account': return issue.keywords.some(k => ['account', 'profile', 'vip', 'login', 'signin', 'membership', 'settings'].includes(k));
          case 'ads': return issue.keywords.some(k => ['ads', 'ad', 'advertisement', 'watch', 'reward'].includes(k));
          case 'performance': return issue.keywords.some(k => ['slow', 'performance', 'lag', 'speed', 'battery', 'storage', 'cache'].includes(k));
          default: return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(query) ||
        issue.description.toLowerCase().includes(query) ||
        issue.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    // Sort by category priority
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, common: 1, minor: 2 };
      return priorityOrder[a.category] - priorityOrder[b.category];
    });
  };

  const handleIssueSelect = (issue: TechnicalIssue) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedIssue(selectedIssue === issue.id ? null : issue.id);
  };

  const handleQuickReport = async (issue: TechnicalIssue) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);
    
    try {
      const response = await BugReportService.submitBugReport({
        title: `VidGro: ${issue.title}`,
        description: `User reported: ${issue.description}\n\nApp Version: 1.0.0\nPlatform: ${Platform.OS}`,
        priority: issue.category === 'critical' ? 'critical' : issue.category === 'common' ? 'medium' : 'low',
        category: 'Mobile App Technical',
        issue_type: 'technical'
      });

      showSuccess(
        'Report Submitted Successfully',
        `Thank you for reporting this issue. Our VidGro support team will investigate and respond promptly.\n\nTicket ID: ${response.bug_id}\n\nExpected response: ${response.estimated_response_time}`
      );
      
      setTimeout(() => {
        setSelectedIssue(null);
        router.back();
      }, 2000);
    } catch (error) {
      
      showError(
        'Submission Failed',
        'There was an error submitting your bug report. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReport = async () => {
    if (!customDescription.trim()) {
      showWarning('Description Required', 'Please describe the technical issue you\'re experiencing');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);
    
    try {
      const response = await BugReportService.submitBugReport({
        title: 'VidGro: Custom Issue Report',
        description: `User description: ${customDescription}\n\nApp Version: 1.0.0\nPlatform: ${Platform.OS}`,
        priority: 'medium',
        category: 'Mobile App Technical',
        issue_type: 'custom'
      });

      showSuccess(
        'Report Submitted Successfully',
        `Thank you for the detailed report. Our VidGro support team will review and respond soon.\n\nTicket ID: ${response.bug_id}\n\nExpected response: ${response.estimated_response_time}`
      );
      
      setTimeout(() => {
        setCustomDescription('');
        router.back();
      }, 2000);
    } catch (error) {
      
      showError(
        'Submission Failed',
        'There was an error submitting your bug report. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'video': return '#E74C3C';
      case 'coins': return '#FFD700';
      case 'account': return '#800080';
      case 'ads': return '#3498DB';
      case 'performance': return '#2ECC71';
      default: return colors.primary;
    }
  };

  const filteredIssues = getFilteredIssues();

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        { 
          backgroundColor: selectedCategory === item.id ? getCategoryColor(item.id) : colors.surface,
          borderColor: selectedCategory === item.id ? getCategoryColor(item.id) : colors.border
        }
      ]}
      onPress={() => setSelectedCategory(item.id)}
      activeOpacity={0.7}
    >
      <item.icon 
        size={isVerySmallScreen ? 14 : 16} 
        color={selectedCategory === item.id ? 'white' : getCategoryColor(item.id)} 
      />
      <Text style={[
        styles.categoryChipText,
        { 
          color: selectedCategory === item.id ? 'white' : colors.text,
          fontSize: isVerySmallScreen ? 11 : 12
        }
      ]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ScreenHeader 
        title="Report Problem" 
        icon={Bug}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={isVerySmallScreen ? 18 : 20} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for your issue..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <RefreshCw size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Navigation */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Problem Categories
          </Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          />
        </View>

        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Quick Issues Grid */}
          <View style={styles.issuesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ⚡ Common Issues
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select your issue below for quick reporting
            </Text>

            {filteredIssues.length === 0 ? (
              <View style={[styles.noResultsContainer, { backgroundColor: colors.surface }]}>
                <Search size={48} color={colors.textSecondary} />
                <Text style={[styles.noResultsTitle, { color: colors.text }]}>
                  No Issues Found
                </Text>
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                  Try adjusting your search or category filter
                </Text>
              </View>
            ) : (
              <View style={styles.issuesGrid}>
                {filteredIssues.map((issue) => (
                  <TouchableOpacity
                    key={issue.id}
                    style={[
                      styles.issueCard,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: selectedIssue === issue.id ? issue.color : colors.border
                      },
                      selectedIssue === issue.id && styles.selectedIssueCard
                    ]}
                    onPress={() => handleIssueSelect(issue)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.issueHeader, { borderBottomColor: colors.border }]}>
                      <View style={[styles.issueIconContainer, { backgroundColor: issue.color + '20' }]}>
                        <issue.icon size={isVerySmallScreen ? 18 : 20} color={issue.color} />
                      </View>
                      <View style={styles.issuePriority}>
                        <View style={[
                          styles.priorityDot,
                          { backgroundColor: issue.category === 'critical' ? '#E74C3C' : issue.category === 'common' ? '#F39C12' : '#2ECC71' }
                        ]} />
                      </View>
                    </View>

                    <View style={styles.issueContent}>
                      <Text style={[
                        styles.issueTitle, 
                        { 
                          color: colors.text,
                          fontSize: isVerySmallScreen ? 13 : 14
                        }
                      ]} numberOfLines={2}>
                        {issue.title}
                      </Text>
                      <Text style={[
                        styles.issueDescription, 
                        { 
                          color: colors.textSecondary,
                          fontSize: isVerySmallScreen ? 11 : 12
                        }
                      ]} numberOfLines={2}>
                        {issue.description}
                      </Text>
                    </View>

                    {selectedIssue === issue.id && (
                      <TouchableOpacity
                        style={[styles.quickReportButton, { backgroundColor: issue.color }]}
                        onPress={() => handleQuickReport(issue)}
                        disabled={loading}
                      >
                        <Send size={isVerySmallScreen ? 12 : 14} color="white" />
                        <Text style={[styles.quickReportText, { fontSize: isVerySmallScreen ? 11 : 12 }]}>
                          {loading ? 'Sending...' : 'Report Now'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Custom Report Section */}
          <View style={[styles.customReportSection, { backgroundColor: colors.surface }]}>
            <View style={styles.customReportHeader}>
              <AlertTriangle size={isVerySmallScreen ? 20 : 24} color={colors.warning} />
              <Text style={[styles.customReportTitle, { color: colors.text }]}>
                📝 Other Issues
              </Text>
            </View>
            
            <Text style={[styles.customReportSubtitle, { color: colors.textSecondary }]}>
              Don't see your issue? Describe it here and we'll help:
            </Text>

            <TextInput
              style={[
                styles.customReportInput,
                { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border
                }
              ]}
              placeholder="Please describe your issue with VidGro in detail..."
              placeholderTextColor={colors.textSecondary}
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              numberOfLines={isVerySmallScreen ? 4 : 5}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.characterCount}>
              <Text style={[styles.characterCountText, { color: colors.textSecondary }]}>
                {customDescription.length}/500 characters
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.customReportButton,
                { backgroundColor: colors.primary },
                (!customDescription.trim() || loading) && styles.buttonDisabled
              ]}
              onPress={handleCustomReport}
              disabled={!customDescription.trim() || loading}
            >
              <Send size={isVerySmallScreen ? 16 : 18} color="white" />
              <Text style={[styles.customReportButtonText, { fontSize: isVerySmallScreen ? 14 : 16 }]}>
                {loading ? 'Submitting Report...' : 'Submit Custom Report'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={[styles.helpSection, { backgroundColor: colors.success + '15' }]}>
            <View style={styles.helpHeader}>
              <Shield size={isVerySmallScreen ? 18 : 20} color={colors.success} />
              <Text style={[styles.helpTitle, { color: colors.success }]}>
                💡 Quick Fixes to Try
              </Text>
            </View>
            
            <View style={styles.helpTips}>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Force close and restart VidGro app
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Check your internet connection
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Update VidGro to the latest version
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Clear app cache in Settings
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Try logging out and back in
              </Text>
            </View>
          </View>

          {/* Response Time Info */}
          <View style={[styles.responseSection, { backgroundColor: colors.primary + '15' }]}>
            <Clock size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
            <View style={styles.responseContent}>
              <Text style={[styles.responseTitle, { color: colors.primary }]}>
                📧 Support Response Times
              </Text>
              <Text style={[styles.responseText, { color: colors.primary }]}>
                • Payment/Coin issues: Within 2 hours
                {'\n'}• VIP issues: Within 4 hours
                {'\n'}• Technical problems: Within 6 hours
                {'\n'}• General inquiries: Within 24 hours
                {'\n'}\nContact: support@vidgro.app
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
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
    elevation: 4,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: isVerySmallScreen ? 14 : 16,
    paddingVertical: 0,
  },
  categoriesSection: {
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 8 : 12,
  },
  sectionSubtitle: {
    fontSize: isVerySmallScreen ? 12 : 14,
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 12 : 16,
    lineHeight: 20,
  },
  categoriesList: {
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 10 : 12,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: isVerySmallScreen ? 4 : 6,
    minWidth: isVerySmallScreen ? 70 : 80,
    justifyContent: 'center',
  },
  categoryChipText: {
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  issuesSection: {
    marginHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 24,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: isVerySmallScreen ? 32 : 40,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noResultsTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isVerySmallScreen ? 8 : 12,
  },
  issueCard: {
    width: isVerySmallScreen ? (screenWidth - 32) / 2 : (screenWidth - 44) / 2,
    borderRadius: 12,
    padding: isVerySmallScreen ? 12 : 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedIssueCard: {
    transform: [{ scale: 1.02 }],
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 8 : 12,
    paddingBottom: isVerySmallScreen ? 6 : 8,
    borderBottomWidth: 1,
  },
  issueIconContainer: {
    width: isVerySmallScreen ? 32 : 36,
    height: isVerySmallScreen ? 32 : 36,
    borderRadius: isVerySmallScreen ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issuePriority: {
    alignItems: 'center',
  },
  priorityDot: {
    width: isVerySmallScreen ? 6 : 8,
    height: isVerySmallScreen ? 6 : 8,
    borderRadius: isVerySmallScreen ? 3 : 4,
  },
  issueContent: {
    flex: 1,
    marginBottom: isVerySmallScreen ? 8 : 12,
  },
  issueTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 4 : 6,
    lineHeight: isVerySmallScreen ? 16 : 18,
  },
  issueDescription: {
    lineHeight: isVerySmallScreen ? 14 : 16,
  },
  quickReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 6 : 8,
    paddingHorizontal: isVerySmallScreen ? 8 : 12,
    borderRadius: 8,
    gap: isVerySmallScreen ? 4 : 6,
    marginTop: 4,
  },
  quickReportText: {
    color: 'white',
    fontWeight: 'bold',
  },
  customReportSection: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 8 : 12,
    gap: isVerySmallScreen ? 8 : 12,
  },
  customReportTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  customReportSubtitle: {
    fontSize: isVerySmallScreen ? 12 : 14,
    lineHeight: 20,
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  customReportInput: {
    borderRadius: 12,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    fontSize: isVerySmallScreen ? 14 : 16,
    borderWidth: 1,
    height: isVerySmallScreen ? 100 : 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  characterCountText: {
    fontSize: isVerySmallScreen ? 10 : 12,
  },
  customReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 12 : 16,
    borderRadius: 12,
    gap: isVerySmallScreen ? 6 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  customReportButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  helpSection: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 8 : 12,
    gap: isVerySmallScreen ? 8 : 12,
  },
  helpTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  helpTips: {
    gap: isVerySmallScreen ? 4 : 6,
  },
  helpTip: {
    fontSize: isVerySmallScreen ? 11 : 12,
    lineHeight: isVerySmallScreen ? 16 : 18,
  },
  responseSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    gap: isVerySmallScreen ? 8 : 12,
  },
  responseContent: {
    flex: 1,
  },
  responseTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  responseText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    lineHeight: isVerySmallScreen ? 16 : 18,
  },
});