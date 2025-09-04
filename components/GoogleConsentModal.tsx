import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GoogleConsentModalProps {
  visible: boolean;
  userEmail: string;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function GoogleConsentModal({
  visible,
  userEmail,
  loading,
  onAccept,
  onDecline,
  onClose,
}: GoogleConsentModalProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
      translateY.value = withTiming(50, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <AnimatedView style={[styles.overlay, overlayStyle]}>
      <View style={styles.overlayTouch} />
      
      <AnimatedView style={[styles.modalContainer, modalStyle]}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={[styles.googleLogo, { backgroundColor: '#4285F4' }]}>
                <Text style={styles.googleText}>G</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Sign in with Google
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.mainContent}>
              {/* Title */}
              <Text style={[styles.mainTitle, { color: colors.text }]}>
                You're creating a new{"\n"}VidGro account
              </Text>

              {/* User Email */}
              <View style={styles.userContainer}>
                <View style={[styles.userAvatar, { backgroundColor: '#0F9D58' }]}>
                  <Text style={styles.userAvatarText}>
                    {userEmail.charAt(0).toLowerCase()}
                  </Text>
                </View>
                <Text style={[styles.userEmailText, { color: colors.text }]}>
                  {userEmail}
                </Text>
              </View>

              {/* Privacy Notice */}
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                VidGro will use your Google account to create your profile and enable video promotion features.
              </Text>

              <Text style={[styles.accountText, { color: colors.textSecondary }]}>
                You can manage your account settings anytime in the app.
              </Text>

              <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                Need help? <Text style={[styles.contactLink, { color: '#1a73e8' }]}>Contact us</Text> anytime.
              </Text>

            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.textSecondary }]}
              onPress={onDecline}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: '#1a73e8' }]}
              onPress={onAccept}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'Creating...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: screenWidth > 360 ? 360 : screenWidth - 40,
    maxHeight: screenHeight * 0.85,
  },
  modal: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 24,
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  googleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5f6368',
  },
  content: {
    maxHeight: screenHeight * 0.6,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
    marginBottom: 32,
    textAlign: 'left',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  userEmailText: {
    fontSize: 14,
    fontWeight: '400',
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '400',
  },
  accountText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '400',
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  contactLink: {
    textDecorationLine: 'none',
    fontWeight: '500',
  },
  linkText: {
    textDecorationLine: 'none',
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 24,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
