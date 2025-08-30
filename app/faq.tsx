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
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
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
    question: 'What is VidGro?',
    answer: 'VidGro is a video promotion platform where you earn coins by watching YouTube videos and use those coins to promote your own videos. It creates a community of engaged viewers and content creators helping each other grow.'
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'How do I start earning coins?',
    answer: 'Open the View tab and start watching videos! You earn 1 coin for each video you watch for at least 30 seconds. Free users can earn up to 50 coins daily, while VIP members have unlimited earning potential.'
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'Is VidGro free to use?',
    answer: 'Yes! VidGro is completely free to use. You can earn coins by watching videos without spending any money. Optional VIP subscriptions and coin packages are available for users who want to accelerate their growth.'
  },

  // Earning Coins
  {
    id: '4',
    category: 'Earning Coins',
    question: 'How many coins do I earn per video?',
    answer: 'You earn 1 coin for each video you watch for the minimum required time of 30 seconds. The countdown timer shows your progress.'
  },
  {
    id: '5',
    category: 'Earning Coins',
    question: 'What is the daily earning limit?',
    answer: 'Free users can earn up to 50 coins per day by watching videos. VIP members enjoy unlimited daily earnings. The limit resets at midnight in your timezone.'
  },
  {
    id: '6',
    category: 'Earning Coins',
    question: 'How do referral bonuses work?',
    answer: 'Earn 10 coins instantly when someone signs up using your referral code! Share your unique code from the Refer Friend screen. There\'s no limit to how many friends you can refer.'
  },
  {
    id: '7',
    category: 'Earning Coins',
    question: 'Can I earn coins offline?',
    answer: 'No, you need an active internet connection to watch videos and earn coins. The app requires connectivity to load videos and verify viewing completion.'
  },

  // Promoting Videos
  {
    id: '8',
    category: 'Promoting Videos',
    question: 'How do I promote my YouTube video?',
    answer: 'Go to the Promote tab, enter your YouTube video URL, select how many views you want (1 coin = 1 view), and submit. Your video will be shown to other users who will watch it to earn coins.'
  },
  {
    id: '9',
    category: 'Promoting Videos',
    question: 'Are the views real?',
    answer: 'Yes! All views come from real users actively watching your video for at least 30 seconds. These are genuine engaged viewers, not bots or fake accounts.'
  },
  {
    id: '10',
    category: 'Promoting Videos',
    question: 'How quickly will I get views?',
    answer: 'View delivery speed depends on current user activity. Most promotions receive views within 24-48 hours. Popular times see faster delivery. VIP promotions get priority placement.'
  },
  {
    id: '11',
    category: 'Promoting Videos',
    question: 'Can I promote any YouTube video?',
    answer: 'You can promote most public YouTube videos. Videos must comply with our content guidelines - no adult content, violence, misleading information, or copyrighted material without permission.'
  },

  // VIP Membership
  {
    id: '12',
    category: 'VIP Membership',
    question: 'What are the VIP benefits?',
    answer: 'VIP members enjoy: unlimited daily coin earnings (no 50 coin limit), priority video promotion, exclusive VIP badge, ad-free experience option, and early access to new features.'
  },
  {
    id: '13',
    category: 'VIP Membership',
    question: 'How much does VIP cost?',
    answer: 'VIP subscriptions are available as monthly or yearly plans. Check the VIP section in the app for current pricing in your region. Save up to 20% with annual billing!'
  },
  {
    id: '14',
    category: 'VIP Membership',
    question: 'Can I cancel VIP anytime?',
    answer: 'Yes! You can cancel your VIP subscription anytime from Settings. You\'ll keep VIP benefits until the end of your current billing period.'
  },
  {
    id: '15',
    category: 'VIP Membership',
    question: 'Is there a free trial?',
    answer: 'New users may be eligible for a 3-day free VIP trial. Check the VIP section to see if you qualify. Cancel anytime during the trial to avoid charges.'
  },

  // Purchasing Coins
  {
    id: '16',
    category: 'Purchasing Coins',
    question: 'How do I buy coins?',
    answer: 'Tap the coin balance or go to Buy Coins in the menu. Choose a package (100 to 10,000 coins), select your payment method, and complete the secure checkout.'
  },
  {
    id: '17',
    category: 'Purchasing Coins',
    question: 'What payment methods are accepted?',
    answer: 'We accept major credit/debit cards, Google Pay, Apple Pay, and other regional payment methods through our secure payment processor.'
  },
  {
    id: '18',
    category: 'Purchasing Coins',
    question: 'Are coin purchases refundable?',
    answer: 'Coin purchases are generally non-refundable once processed. If you experience technical issues with your purchase, contact support within 48 hours for assistance.'
  },
  {
    id: '19',
    category: 'Purchasing Coins',
    question: 'Is it safe to make purchases?',
    answer: 'Yes! All payments are processed through secure, encrypted channels. We never store your payment information directly. Look for the padlock icon during checkout.'
  },

  // Account & Security
  {
    id: '20',
    category: 'Account & Security',
    question: 'How do I reset my password?',
    answer: 'On the login screen, tap "Forgot Password" and enter your email. You\'ll receive a reset link within minutes. Check your spam folder if you don\'t see it.'
  },
  {
    id: '21',
    category: 'Account & Security',
    question: 'Can I use VidGro on multiple devices?',
    answer: 'Yes! You can log into your account on multiple devices. Your coins and progress sync automatically. For security, we may log out inactive devices.'
  },
  {
    id: '22',
    category: 'Account & Security',
    question: 'Is my account secure?',
    answer: 'We use enterprise-grade security including encryption, secure authentication, and anti-tampering protection. Enable two-factor authentication in Settings for extra security.'
  },
  {
    id: '23',
    category: 'Account & Security',
    question: 'What happens if I delete my account?',
    answer: 'Account deletion is permanent. You\'ll lose all coins, promotion history, and referral bonuses. Consider taking a break instead by simply not using the app.'
  },

  // Analytics & Tracking
  {
    id: '24',
    category: 'Analytics & Tracking',
    question: 'How do I track my promotions?',
    answer: 'The Analytics tab shows detailed statistics for all your promotions including views delivered, completion rate, and performance over time.'
  },
  {
    id: '25',
    category: 'Analytics & Tracking',
    question: 'What metrics are available?',
    answer: 'Track total views, daily earnings, promotion history, referral success, coin balance history, and viewing patterns. Export data for deeper analysis.'
  },
  {
    id: '26',
    category: 'Analytics & Tracking',
    question: 'How accurate are the view counts?',
    answer: 'View counts are 100% accurate and updated in real-time. Each view represents a real user watching your video for at least 30 seconds.'
  },

  // Technical Support
  {
    id: '27',
    category: 'Technical Support',
    question: 'The app won\'t open or crashes immediately',
    answer: 'Try uninstalling and reinstalling the app. Make sure you\'re running the latest version. If problems persist, your device may not meet minimum requirements.'
  },
  {
    id: '28',
    category: 'Technical Support',
    question: 'Videos won\'t load or play',
    answer: 'Check your internet connection and try switching between WiFi and mobile data. Clear the app cache in your device settings. Some videos may be region-restricted.'
  },
  {
    id: '29',
    category: 'Technical Support',
    question: 'My coins disappeared',
    answer: 'Check the Analytics tab for recent transactions. Coins may have been used for promotions. If you believe there\'s an error, contact support with your account details.'
  },

  // Troubleshooting
  {
    id: '30',
    category: 'Troubleshooting',
    question: 'Why am I seeing ads?',
    answer: 'Ads help keep VidGro free for everyone. You can reduce ad frequency in Settings or upgrade to VIP for an ad-free experience. Configure your ad preferences for better relevance.'
  },
  {
    id: '31',
    category: 'Troubleshooting',
    question: 'The timer isn\'t counting down',
    answer: 'The timer pauses if you switch apps, lock your screen, or if the video stops playing. Stay in the app with the video playing to continue earning.'
  },
  {
    id: '32',
    category: 'Troubleshooting',
    question: 'I\'m not receiving referral bonuses',
    answer: 'Referral bonuses are credited when your friend signs up AND completes email verification. Make sure they use your exact referral code during registration.'
  }
];

const categories = [
  'Getting Started',
  'Earning Coins',
  'Promoting Videos',
  'VIP Membership',
  'Purchasing Coins',
  'Account & Security',
  'Analytics & Tracking',
  'Technical Support',
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
      <ScreenHeader 
        title="FAQ" 
        icon={HelpCircle}
      />

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
