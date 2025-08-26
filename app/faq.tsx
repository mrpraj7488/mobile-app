import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, ArrowLeft, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Responsive helpers
const { width: screenWidth } = Dimensions.get('window');
const isTinyScreen = screenWidth < 340;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I start earning coins?',
    answer: 'Simply watch videos in the View tab! Each video you watch completely will reward you with coins. The number of coins earned is displayed before you start watching.'
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'What is VidGro?',
    answer: 'VidGro is a platform where you can earn coins by watching YouTube videos and creators can promote their content to engaged viewers. It\'s a win-win for both viewers and content creators.'
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'Tap the "Sign Up" button on the login screen, enter your email and create a secure password. You\'ll receive a confirmation email to verify your account.'
  },

  // Earning Coins
  {
    id: '4',
    category: 'Earning Coins',
    question: 'How many coins do I earn per video?',
    answer: 'Coin rewards vary by video, typically ranging from 1-10 coins. The exact amount is shown before you start watching each video.'
  },
  {
    id: '5',
    category: 'Earning Coins',
    question: 'Do I need to watch the entire video?',
    answer: 'Yes, you need to watch the video for the specified duration (shown as a countdown timer) to earn coins. The timer pauses if you leave the app or switch tabs.'
  },
  {
    id: '6',
    category: 'Earning Coins',
    question: 'Why didn\'t I receive coins after watching a video?',
    answer: 'Make sure you watched the video for the full required duration. If the video had technical issues or you switched apps during viewing, coins may not be awarded. Check your Recent Activity for transaction history.'
  },
  {
    id: '7',
    category: 'Earning Coins',
    question: 'Can I watch the same video multiple times?',
    answer: 'No, you can only earn coins once per video. After earning coins from a video, it won\'t appear in your queue again.'
  },

  // Video Watching
  {
    id: '8',
    category: 'Video Watching',
    question: 'Why won\'t the video play?',
    answer: 'Check your internet connection and try refreshing. Some videos may be region-restricted or temporarily unavailable. You can skip problematic videos using the skip button.'
  },
  {
    id: '9',
    category: 'Video Watching',
    question: 'Can I control video playback?',
    answer: 'Yes! Tap the video to play/pause. You can also open the video directly on YouTube using the "Open on YouTube" button for full controls.'
  },
  {
    id: '10',
    category: 'Video Watching',
    question: 'What is Auto Skip mode?',
    answer: 'Auto Skip automatically moves to the next video after you\'ve earned coins. You can toggle this feature on/off in the video player controls.'
  },
  {
    id: '11',
    category: 'Video Watching',
    question: 'Why does the timer pause?',
    answer: 'The timer pauses when you switch apps, minimize the app, or if the video stops playing. This ensures you\'re actively watching to earn coins.'
  },

  // Account & Profile
  {
    id: '12',
    category: 'Account & Profile',
    question: 'How do I check my coin balance?',
    answer: 'Your current coin balance is displayed in the top-right corner of most screens. You can also view detailed transaction history in the Analytics tab.'
  },
  {
    id: '13',
    category: 'Account & Profile',
    question: 'How do I change my password?',
    answer: 'Go to Settings > Account > Change Password. You\'ll need to enter your current password and create a new one.'
  },
  {
    id: '14',
    category: 'Account & Profile',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account in Settings > Account > Delete Account. This action is permanent and cannot be undone.'
  },
  {
    id: '15',
    category: 'Account & Profile',
    question: 'How do I update my email address?',
    answer: 'Currently, email changes require contacting support. Use the "Contact Support" option in the menu to request an email change.'
  },

  // Technical Issues
  {
    id: '16',
    category: 'Technical Issues',
    question: 'The app is running slowly or crashing',
    answer: 'Try closing and reopening the app. If issues persist, restart your device or check for app updates in your device\'s app store.'
  },
  {
    id: '17',
    category: 'Technical Issues',
    question: 'Videos are not loading',
    answer: 'Check your internet connection. Try switching between WiFi and mobile data. If problems continue, the video servers may be temporarily down.'
  },
  {
    id: '18',
    category: 'Technical Issues',
    question: 'I\'m not receiving notifications',
    answer: 'Check your device notification settings for VidGro. Ensure notifications are enabled in both the app settings and your device settings.'
  },
  {
    id: '19',
    category: 'Technical Issues',
    question: 'The app won\'t sync my progress',
    answer: 'Make sure you\'re connected to the internet. Try logging out and back in. If issues persist, contact support.'
  },

  // Content & Videos
  {
    id: '20',
    category: 'Content & Videos',
    question: 'What types of videos are available?',
    answer: 'VidGro features a variety of YouTube content including educational videos, entertainment, tutorials, music, and more. Content is curated to be engaging and appropriate.'
  },
  {
    id: '21',
    category: 'Content & Videos',
    question: 'Can I request specific types of videos?',
    answer: 'While you can\'t request specific videos, the algorithm learns from your viewing patterns to show more relevant content over time.'
  },
  {
    id: '22',
    category: 'Content & Videos',
    question: 'Why do I see the same types of videos?',
    answer: 'The system personalizes content based on your viewing history. Try watching different types of videos to diversify your recommendations.'
  },
  {
    id: '23',
    category: 'Content & Videos',
    question: 'How often are new videos added?',
    answer: 'New videos are added regularly throughout the day. The exact frequency depends on creator submissions and content approval processes.'
  },

  // Rewards & Coins
  {
    id: '24',
    category: 'Rewards & Coins',
    question: 'What can I do with my coins?',
    answer: 'Currently, coins serve as a reward system and leaderboard ranking. Future updates may include coin redemption options and special features.'
  },
  {
    id: '25',
    category: 'Rewards & Coins',
    question: 'Do coins expire?',
    answer: 'No, your earned coins never expire. They remain in your account permanently.'
  },
  {
    id: '26',
    category: 'Rewards & Coins',
    question: 'Can I transfer coins to other users?',
    answer: 'Currently, coin transfers between users are not supported. Coins are tied to your individual account.'
  },

  // Privacy & Safety
  {
    id: '27',
    category: 'Privacy & Safety',
    question: 'Is my viewing data private?',
    answer: 'Yes, your viewing data is kept private and secure. We only track viewing completion for coin rewards and don\'t share personal viewing habits.'
  },
  {
    id: '28',
    category: 'Privacy & Safety',
    question: 'How is my personal information protected?',
    answer: 'We use industry-standard encryption and security measures to protect your data. We never sell your personal information to third parties.'
  },
  {
    id: '29',
    category: 'Privacy & Safety',
    question: 'Can I control what data is collected?',
    answer: 'Yes, you can review and control data collection in Settings > Privacy. You can also request data deletion by contacting support.'
  },

  // Troubleshooting
  {
    id: '30',
    category: 'Troubleshooting',
    question: 'I forgot my password',
    answer: 'On the login screen, tap "Forgot Password" and enter your email. You\'ll receive a password reset link within a few minutes.'
  },
  {
    id: '31',
    category: 'Troubleshooting',
    question: 'My account is locked',
    answer: 'Account locks usually occur after multiple failed login attempts. Wait 15 minutes and try again, or contact support for immediate assistance.'
  },
  {
    id: '32',
    category: 'Troubleshooting',
    question: 'I can\'t log in with my credentials',
    answer: 'Double-check your email and password. Ensure caps lock is off and try copying/pasting your password. If issues persist, use the password reset option.'
  }
];

const categories = [
  'Getting Started',
  'Earning Coins',
  'Video Watching',
  'Account & Profile',
  'Technical Issues',
  'Content & Videos',
  'Rewards & Coins',
  'Privacy & Safety',
  'Troubleshooting'
];

export default function FAQScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = selectedCategory === 'All' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const groupedFAQs = categories.reduce((acc, category) => {
    const categoryItems = filteredFAQs.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      acc[category] = categoryItems;
    }
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FAQ</Text>
          <HelpCircle size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Category Filter */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse by Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedCategory === 'All' && [styles.categoryButtonActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text style={[
                styles.categoryButtonText,
                { color: selectedCategory === 'All' ? 'white' : colors.text }
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedCategory === category && [styles.categoryButtonActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  { color: selectedCategory === category ? 'white' : colors.text }
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {selectedCategory === 'All' ? (
          // Show all categories with headers
          Object.entries(groupedFAQs).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={[styles.categorySectionTitle, { color: colors.primary }]}>
                {category}
              </Text>
              {items.map((item) => (
                <View key={item.id} style={[styles.faqItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleExpanded(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>
                      {item.question}
                    </Text>
                    {expandedItems.has(item.id) ? (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  {expandedItems.has(item.id) && (
                    <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                      <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        ) : (
          // Show filtered category items
          filteredFAQs.map((item) => (
            <View key={item.id} style={[styles.faqItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleExpanded(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqQuestion, { color: colors.text }]}>
                  {item.question}
                </Text>
                {expandedItems.has(item.id) ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {expandedItems.has(item.id) && (
                <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                    {item.answer}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Contact Support Section */}
        <View style={[styles.contactSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>
            Still need help?
          </Text>
          <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
            If you couldn't find the answer you're looking for, our support team is here to help.
          </Text>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/contact-support')}
          >
            <Text style={[styles.contactButtonText, { color: colors.background }]}>
              Contact Support
            </Text>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 50,
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
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryScrollContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryButtonActive: {
    borderWidth: 2,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    marginTop: -1,
  },
  faqAnswerText: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  contactSection: {
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  contactButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
