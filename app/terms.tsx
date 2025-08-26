import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FileText, Scale, Shield, TriangleAlert as AlertTriangle } from 'lucide-react-native';

export default function TermsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const sections = [
    {
      title: 'Acceptance of Terms',
      icon: FileText,
      content: `By accessing and using VidGro ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.

If you do not agree to abide by the above, please do not use this service. These terms constitute a legally binding agreement between you and VidGro.`
    },
    {
      title: 'Service Description',
      icon: Shield,
      content: `VidGro is a video promotion and monetization platform that allows users to:

• Watch videos and earn virtual coins
• Promote their own YouTube videos using coins
• Purchase additional coins through in-app purchases
• Subscribe to VIP memberships for enhanced features
• Refer friends and earn referral bonuses

The service is provided "as is" and we reserve the right to modify or discontinue features at any time.`
    },
    {
      title: 'User Accounts and Responsibilities',
      icon: Scale,
      content: `When creating an account, you agree to:

• Provide accurate and complete information
• Maintain the security of your account credentials
• Be responsible for all activities under your account
• Not share your account with others
• Not create multiple accounts to circumvent limitations
• Not use automated tools or bots to interact with the service

You must be at least 13 years old to use this service. Users under 18 require parental consent.`
    },
    {
      title: 'Prohibited Activities',
      icon: AlertTriangle,
      content: `You may not:

• Upload, promote, or share illegal, harmful, or inappropriate content
• Attempt to manipulate the coin earning system
• Use the service for spam or fraudulent activities
• Reverse engineer or attempt to hack the platform
• Violate any applicable laws or regulations
• Infringe on intellectual property rights
• Harass or abuse other users or our support team

Violation of these terms may result in account suspension or termination.`
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <FileText size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.introSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Please read these Terms of Service carefully before using VidGro. These terms govern your use of our platform and services.
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: January 15, 2025</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <section.icon size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Scale size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Virtual Currency</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            Coins are virtual currency with no real-world value. They can be:
            {'\n\n'}• Earned by watching videos
            {'\n'}• Purchased through in-app purchases
            {'\n'}• Used to promote videos on the platform
            {'\n'}• Lost if account is terminated for violations
            {'\n\n'}Coins cannot be exchanged for real money or transferred between accounts. We reserve the right to adjust coin values and rewards at any time.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Content and Intellectual Property</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            You retain ownership of content you submit but grant us a license to use, display, and distribute it on our platform.
            {'\n\n'}You represent that you have the right to share any content you promote and that it doesn't violate any third-party rights.
            {'\n\n'}We respect intellectual property rights and will respond to valid DMCA takedown notices.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Disclaimers and Limitations</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
            {'\n\n'}We are not liable for:
            {'\n'}• Service interruptions or downtime
            {'\n'}• Loss of coins or account data
            {'\n'}• Third-party content or actions
            {'\n'}• Indirect or consequential damages
            {'\n\n'}Our total liability is limited to the amount you paid for the service in the past 12 months.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Scale size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Termination</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            Either party may terminate this agreement at any time:
            {'\n\n'}• You can delete your account through the app settings
            {'\n'}• We may suspend or terminate accounts for violations
            {'\n'}• Upon termination, your access to coins and content will be lost
            {'\n'}• Certain provisions will survive termination (privacy, disputes, etc.)
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Governing Law and Disputes</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            These terms are governed by the laws of [Your Jurisdiction].
            {'\n\n'}Any disputes will be resolved through binding arbitration, except for:
            {'\n'}• Small claims court matters
            {'\n'}• Intellectual property disputes
            {'\n'}• Injunctive relief requests
            {'\n\n'}You waive the right to participate in class action lawsuits.
          </Text>
        </View>

        <View style={[styles.contactSection, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }]}>
          <Text style={[styles.contactTitle, { color: colors.primary }]}>Questions About These Terms?</Text>
          <Text style={[styles.contactText, { color: colors.primary }]}>
            If you have any questions about these Terms of Service, please contact us:
            {'\n\n'}Email: legal@vidgro.com
            {'\n'}Address: 123 Legal Street, Terms City, TC 12345
            {'\n'}Phone: +1 (555) 123-4567
          </Text>
        </View>

        <View style={[styles.changesSection, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)', borderLeftColor: colors.warning }]}>
          <Text style={[styles.changesTitle, { color: colors.warning }]}>Changes to Terms</Text>
          <Text style={[styles.changesText, { color: colors.warning }]}>
            We may update these Terms of Service from time to time. We will notify you of any changes by posting the new terms on this page and updating the "Last updated" date.
            {'\n\n'}Your continued use of the service after changes constitutes acceptance of the new terms.
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
  introSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
  },
  changesSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
  },
  changesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  changesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});