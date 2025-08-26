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
import { ArrowLeft, Search, Bug, Wifi, Play, Coins, Crown, Shield, RefreshCw, Smartphone, TriangleAlert as AlertTriangle, Send, ChevronRight, Clock, Database, Settings, Eye, Volume2 } from 'lucide-react-native';
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
    { id: 'video', title: 'Video', icon: Play },
    { id: 'coins', title: 'Coins', icon: Coins },
    { id: 'account', title: 'Account', icon: Crown },
    { id: 'connection', title: 'Network', icon: Wifi },
    { id: 'performance', title: 'Performance', icon: RefreshCw },
  ];

  const technicalIssues: TechnicalIssue[] = [
    // Critical Issues
    {
      id: 'app-crash',
      title: 'App Crashes',
      description: 'App suddenly closes or freezes',
      icon: AlertTriangle,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['crash', 'freeze', 'close', 'stop', 'exit', 'quit']
    },
    {
      id: 'login-failed',
      title: 'Cannot Login',
      description: 'Unable to sign in to account',
      icon: Shield,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['login', 'signin', 'password', 'account', 'access']
    },
    {
      id: 'coins-missing',
      title: 'Coins Not Added',
      description: 'Purchased coins not showing in balance',
      icon: Coins,
      color: '#E74C3C',
      category: 'critical',
      keywords: ['coins', 'purchase', 'balance', 'missing', 'payment']
    },

    // Video Issues
    {
      id: 'video-not-loading',
      title: 'Videos Not Loading',
      description: 'Videos fail to play or load',
      icon: Play,
      color: '#F39C12',
      category: 'common',
      keywords: ['video', 'play', 'load', 'stream', 'watch']
    },
    {
      id: 'video-stuck',
      title: 'Video Stuck/Buffering',
      description: 'Videos keep buffering or get stuck',
      icon: Clock,
      color: '#F39C12',
      category: 'common',
      keywords: ['buffer', 'stuck', 'loading', 'slow', 'lag']
    },
    {
      id: 'no-sound',
      title: 'No Audio/Sound',
      description: 'Videos play without sound',
      icon: Volume2,
      color: '#F39C12',
      category: 'common',
      keywords: ['sound', 'audio', 'volume', 'mute', 'silent']
    },

    // Coin Issues
    {
      id: 'coins-not-earned',
      title: 'Coins Not Earned',
      description: 'Not receiving coins after watching videos',
      icon: Coins,
      color: '#F39C12',
      category: 'common',
      keywords: ['coins', 'earn', 'reward', 'watch', 'not receiving']
    },
    {
      id: 'wrong-coin-amount',
      title: 'Wrong Coin Amount',
      description: 'Receiving incorrect coin rewards',
      icon: Database,
      color: '#3498DB',
      category: 'minor',
      keywords: ['coins', 'amount', 'wrong', 'incorrect', 'calculation']
    },

    // Account Issues
    {
      id: 'vip-not-working',
      title: 'VIP Features Not Working',
      description: 'VIP benefits not applying correctly',
      icon: Crown,
      color: '#800080',
      category: 'common',
      keywords: ['vip', 'premium', 'benefits', 'discount', 'features']
    },
    {
      id: 'profile-sync',
      title: 'Profile Not Syncing',
      description: 'Profile data not updating across devices',
      icon: RefreshCw,
      color: '#3498DB',
      category: 'minor',
      keywords: ['profile', 'sync', 'update', 'data', 'device']
    },

    // Network Issues
    {
      id: 'connection-error',
      title: 'Connection Problems',
      description: 'Internet connectivity issues',
      icon: Wifi,
      color: '#E74C3C',
      category: 'common',
      keywords: ['connection', 'internet', 'network', 'offline', 'wifi']
    },
    {
      id: 'slow-loading',
      title: 'Slow Loading',
      description: 'App or content loads very slowly',
      icon: Clock,
      color: '#F39C12',
      category: 'minor',
      keywords: ['slow', 'loading', 'speed', 'performance', 'lag']
    },

    // Performance Issues
    {
      id: 'app-slow',
      title: 'App Running Slow',
      description: 'Overall app performance is sluggish',
      icon: Smartphone,
      color: '#F39C12',
      category: 'minor',
      keywords: ['slow', 'performance', 'lag', 'sluggish', 'speed']
    },
    {
      id: 'battery-drain',
      title: 'High Battery Usage',
      description: 'App drains battery quickly',
      icon: Settings,
      color: '#3498DB',
      category: 'minor',
      keywords: ['battery', 'drain', 'power', 'usage', 'consumption']
    },

    // UI Issues
    {
      id: 'display-issues',
      title: 'Display Problems',
      description: 'UI elements not showing correctly',
      icon: Eye,
      color: '#3498DB',
      category: 'minor',
      keywords: ['display', 'ui', 'interface', 'layout', 'visual']
    },
    {
      id: 'touch-not-working',
      title: 'Touch Not Responsive',
      description: 'Buttons or touch gestures not working',
      icon: Smartphone,
      color: '#F39C12',
      category: 'common',
      keywords: ['touch', 'tap', 'button', 'gesture', 'responsive']
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
          case 'video': return issue.keywords.some(k => ['video', 'play', 'stream', 'watch', 'buffer'].includes(k));
          case 'coins': return issue.keywords.some(k => ['coins', 'earn', 'reward', 'payment', 'balance'].includes(k));
          case 'account': return issue.keywords.some(k => ['account', 'profile', 'vip', 'login', 'signin'].includes(k));
          case 'connection': return issue.keywords.some(k => ['connection', 'network', 'wifi', 'internet', 'offline'].includes(k));
          case 'performance': return issue.keywords.some(k => ['slow', 'performance', 'lag', 'speed', 'battery'].includes(k));
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
        title: issue.title,
        description: issue.description,
        priority: issue.category === 'critical' ? 'critical' : issue.category === 'common' ? 'medium' : 'low',
        category: 'Mobile App Technical',
        issue_type: 'technical'
      });

      showSuccess(
        'Report Submitted',
        `Your report for "${issue.title}" has been submitted successfully. Our technical team will investigate this issue.\n\nTicket ID: ${response.bug_id}\n\nExpected response time: ${response.estimated_response_time}`
      );
      
      setTimeout(() => {
        setSelectedIssue(null);
        router.back();
      }, 2000);
    } catch (error) {
      console.error('Error submitting bug report:', error);
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
        title: 'Custom Technical Issue',
        description: customDescription,
        priority: 'medium',
        category: 'Mobile App Technical',
        issue_type: 'technical'
      });

      showSuccess(
        'Custom Report Submitted',
        `Your detailed technical report has been submitted successfully.\n\nTicket ID: ${response.bug_id}\n\nOur technical team will review your description and respond within ${response.estimated_response_time}.`
      );
      
      setTimeout(() => {
        setCustomDescription('');
        router.back();
      }, 2000);
    } catch (error) {
      console.error('Error submitting custom bug report:', error);
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
      case 'connection': return '#3498DB';
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
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Problem</Text>
          <Bug size={24} color="white" />
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={isVerySmallScreen ? 18 : 20} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for your technical issue..."
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
            🔍 Issue Categories
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
              ⚡ Quick Report
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Tap an issue to report it instantly
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
                📝 Describe Your Issue
              </Text>
            </View>
            
            <Text style={[styles.customReportSubtitle, { color: colors.textSecondary }]}>
              Can't find your issue above? Describe it in detail below:
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
              placeholder="Describe the technical problem you're experiencing..."
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
                💡 Before Reporting
              </Text>
            </View>
            
            <View style={styles.helpTips}>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Try restarting the app first
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Check your internet connection
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Update to the latest app version
              </Text>
              <Text style={[styles.helpTip, { color: colors.success }]}>
                • Clear app cache if issues persist
              </Text>
            </View>
          </View>

          {/* Response Time Info */}
          <View style={[styles.responseSection, { backgroundColor: colors.primary + '15' }]}>
            <Clock size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
            <View style={styles.responseContent}>
              <Text style={[styles.responseTitle, { color: colors.primary }]}>
                📞 Technical Support Response
              </Text>
              <Text style={[styles.responseText, { color: colors.primary }]}>
                • Critical issues: Within 1 hour
                {'\n'}• Common issues: Within 2-4 hours
                {'\n'}• Minor issues: Within 24 hours
                {'\n'}• Custom reports: Within 4-8 hours
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