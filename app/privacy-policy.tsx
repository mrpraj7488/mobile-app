import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Eye, Lock, Database } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const sections = [
    {
      title: 'Information We Collect',
      icon: Database,
      content: `VidGro collects information to provide and improve our video promotion platform.

Information you provide:
• Account details (email, username, profile picture)
• Video URLs and promotion settings
• Coin transactions and balance
• Referral codes and VIP status
• Support tickets and bug reports
• Ad configuration preferences

Automatically collected:
• Device information (model, OS version, app version)
• Usage analytics and watch history
• Network information and IP address
• Performance metrics and crash reports
• Battery optimization preferences
• Cache and storage usage patterns`
    },
    {
      title: 'How We Use Your Information',
      icon: Eye,
      content: `Your information helps us deliver and enhance the VidGro experience:

• Process video promotions and manage view distribution
• Handle coin transactions and VIP subscriptions
• Implement referral rewards and bonus systems
• Optimize battery usage and performance
• Detect and prevent fraud, cheating, and abuse
• Provide customer support and resolve issues
• Send important updates and notifications
• Analyze trends to improve features
• Ensure security with anti-tampering measures
• Comply with legal and regulatory requirements
• Personalize your experience and recommendations`
    },
    {
      title: 'Information Sharing',
      icon: Shield,
      content: `We do not sell, trade, or rent your personal information to third parties.

We may share your information only in these limited circumstances:
• With your explicit consent
• To comply with legal requirements
• To protect our rights and prevent fraud
• With service providers who assist in platform operations
• In connection with a business transfer or merger`
    },
    {
      title: 'Data Security',
      icon: Lock,
      content: `VidGro employs enterprise-grade security to protect your data:

• End-to-end encryption for sensitive data
• Certificate pinning to prevent MITM attacks
• Anti-tampering and root/jailbreak detection
• Secure storage with obfuscation
• Real-time security monitoring
• Rate limiting and DDoS protection
• Regular security audits and updates
• Biometric authentication support
• Automatic session management
• Code obfuscation and anti-debugging

While we use industry-best practices, no system is 100% secure. We continuously update our security measures.`
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader 
        title="Privacy Policy" 
        icon={Shield}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.introSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Your Privacy Matters</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            VidGro is committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data in compliance with GDPR, CCPA, and other privacy regulations.
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
            <Shield size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Rights</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            You have the right to:
            {'\n\n'}• Access your personal information
            {'\n'}• Correct inaccurate data
            {'\n'}• Delete your account and data
            {'\n'}• Export your data
            {'\n'}• Opt out of marketing communications
            {'\n'}• File a complaint with data protection authorities
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Database size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Retention</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal purposes.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Eye size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics and Tracking</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            We use analytics to improve VidGro:
            {'\n\n'}• Track video watch completion rates
            {'\n'}• Monitor coin earning patterns
            {'\n'}• Analyze feature usage and engagement
            {'\n'}• Detect unusual activity patterns
            {'\n'}• Optimize battery and performance
            {'\n'}• Measure ad effectiveness
            {'\n\n'}All analytics data is anonymized and aggregated. You can opt-out in Settings.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Lock size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Age Requirements</Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            VidGro is intended for users aged 13 and above. Users under 18 should have parental consent.
            {'\n\n'}We do not knowingly collect data from children under 13. If we discover such data has been collected, we will delete it immediately.
            {'\n\n'}Parents can contact us to review, delete, or restrict processing of their child's information.
          </Text>
        </View>

        <View style={[styles.contactSection, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }]}>
          <Text style={[styles.contactTitle, { color: colors.primary }]}>Contact Us</Text>
          <Text style={[styles.contactText, { color: colors.primary }]}>
            If you have questions about this Privacy Policy or your data:
            {'\n\n'}Email: support@vidgro.app
            {'\n'}In-App: Settings → Contact Support
            {'\n'}Response Time: Within 24-48 hours
            {'\n\n'}For data deletion requests, please use the Delete Account option in Settings.
          </Text>
        </View>

        <View style={[styles.changesSection, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)', borderLeftColor: colors.warning }]}>
          <Text style={[styles.changesTitle, { color: colors.warning }]}>Changes to This Policy</Text>
          <Text style={[styles.changesText, { color: colors.warning }]}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
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