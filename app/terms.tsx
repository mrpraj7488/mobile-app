import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Scale, Shield, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';

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
      content: `VidGro is a video promotion platform that enables users to:

• Watch YouTube videos and earn coins (1 coin per video)
• Promote videos using earned or purchased coins
• Get guaranteed real views from active users
• Subscribe to VIP for unlimited daily earnings
• Earn referral bonuses (10 coins per friend)
• Configure ad preferences and frequency
• Track analytics and promotion performance

The service operates on a coin-based economy where users exchange time watching videos for promotion credits. We reserve the right to modify features and coin values.`
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
      content: `Strictly prohibited activities include:

• Using bots, scripts, or automation tools
• Creating multiple accounts to exploit the system
• Tampering with the app or bypassing security measures
• Promoting copyrighted content without permission
• Sharing adult, violent, or misleading content
• Using modified or jailbroken devices
• Attempting to hack or reverse-engineer the app
• Manipulating view counts or coin earnings
• Using VPNs to bypass regional restrictions
• Selling or transferring accounts
• Abusing the referral system

Violations result in immediate account termination and loss of all coins.`
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader 
        title="Terms of Service" 
        icon={FileText}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.introSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Please read these Terms of Service carefully before using VidGro. These terms govern your use of our platform and services.
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last updated: December 27, 2024</Text>
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
            VidGro Coins are virtual credits with no monetary value:
            {'\n\n'}• Earn 1 coin per video watched (30-second minimum)
            {'\n'}• Daily limit: 50 coins (unlimited with VIP)
            {'\n'}• Referral bonus: 10 coins per successful referral
            {'\n'}• Purchase packages: 100-10,000 coins
            {'\n'}• Promotion cost: 1 coin = 1 guaranteed view
            {'\n\n'}Coins are non-transferable, non-refundable, and expire after 1 year of inactivity. We may adjust earning rates and costs to maintain platform balance.
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
            These terms are governed by applicable international laws and regulations.
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
            For questions about these Terms of Service:
            {'\n\n'}Email: support@vidgro.app
            {'\n'}In-App: Settings → Contact Support
            {'\n'}Response Time: 24-48 hours
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