import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAlert } from '@/contexts/AlertContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, TriangleAlert as AlertTriangle, Shield, ArrowLeft } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { useNetwork } from '@/services/NetworkHandler';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/contexts/NotificationContext';

export default function DeleteAccountScreen() {
  const { user, profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError } = useAlert();
  const router = useRouter();
  const { showNetworkAlert } = useNetwork();
  const { showNotification } = useNotification();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      showError('Error', 'Please type "DELETE" to confirm account deletion');
      return;
    }

    setLoading(true);
    
    try {
      if (!user?.id) {
        throw new Error('No user found');
      }

      // Delete user profile from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Delete user from Supabase Auth using RPC function
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      
      if (deleteError) {
        // Fallback: just sign out the user
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error('Sign out error:', signOutError);
        }
      }

      // Show slide notification
      showNotification('success', 'Account deleted successfully. Thank you for using VidGro.');
      
      // Sign out and redirect after a brief delay
      setTimeout(async () => {
        await signOut();
        router.replace('/(auth)/login');
      }, 1500);
      
    } catch (error: any) {
      showError(
        'Deletion Failed', 
        'Failed to delete account. Please try again or contact support.'
      );
      setLoading(false);
    }
  };

  const dataToDelete = [
    'Your profile information and username',
    'All promoted videos and their analytics',
    'Coin transaction history',
    'Video viewing history',
    'VIP subscription status',
    'Referral codes and bonuses',
    'Support tickets and communications',
    'All personal preferences and settings'
  ];

  if (step === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader 
          title="Delete Account" 
          icon={Trash2}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.warningContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.4)' }]}>
            <AlertTriangle size={48} color="#E74C3C" />
            <Text style={[styles.warningTitle, { color: colors.error }]}>Account Deletion Warning</Text>
            <Text style={[styles.warningText, { color: colors.error }]}>
              Deleting your account is permanent and cannot be undone. Please consider the consequences carefully.
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What will be deleted:</Text>
            {dataToDelete.map((item, index) => (
              <View key={index} style={styles.deleteItem}>
                <Text style={[styles.bullet, { color: colors.error }]}>•</Text>
                <Text style={[styles.deleteText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>      
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.error }]}
            onPress={() => setStep(2)}
          >
            <Text style={[styles.continueButtonText, { color: 'white' }]}>Continue with Deletion</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Deletion</Text>
          <Trash2 size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.confirmationContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.confirmationTitle, { color: colors.text }]}>Final Step</Text>
          <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>
            To confirm account deletion, please type "DELETE" in the box below:
          </Text>

          <TextInput
            style={[styles.confirmInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Type DELETE here"
            placeholderTextColor={colors.textSecondary}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />

          <View style={[styles.accountInfo, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.accountInfoTitle, { color: colors.text }]}>Account to be deleted:</Text>
            <Text style={[styles.accountInfoText, { color: colors.textSecondary }]}>Username: {profile?.username}</Text>
            <Text style={[styles.accountInfoText, { color: colors.textSecondary }]}>Email: {profile?.email}</Text>
            <Text style={[styles.accountInfoText, { color: colors.textSecondary }]}>Coins: {profile?.coins}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: colors.error },
              (loading || confirmText !== 'DELETE') && styles.buttonDisabled
            ]}
            onPress={handleDeleteAccount}
            disabled={loading || confirmText !== 'DELETE'}
          >
            <Trash2 size={20} color="white" />
            <Text style={styles.deleteButtonText}>
              {loading ? 'Deleting Account...' : 'Delete Account Forever'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel - Keep My Account</Text>
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
  warningContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFCDD2',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deleteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  deleteText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  alternativesSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  alternativesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  alternativeText: {
    fontSize: 16,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmationContainer: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 24,
    color: '#333',
    marginBottom: 16,
  },
  confirmationText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmInput: {
    width: '100%',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  accountInfo: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  accountInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  accountInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
});