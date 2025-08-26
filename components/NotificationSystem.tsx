import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Info,
  X
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isShortScreen = screenHeight < 700;

// Dynamic sizing based on screen size
const getResponsiveSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.85;
  return baseSize;
};

const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    return isShortScreen ? 44 : 50;
  }
  return StatusBar.currentHeight || 24;
};

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'network';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
}

interface NotificationItemProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // Auto dismiss (unless persistent)
    if (!notification.persistent && notification.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      onDismiss(notification.id);
      notification.onDismiss?.();
    });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (notification.onPress) {
      notification.onPress();
    } else if (!notification.persistent) {
      handleDismiss();
    }
  };

  const getNotificationConfig = () => {
    // More opaque backgrounds for better visibility
    const baseOpacity = isDark ? 0.9 : 0.95;
    
    switch (notification.type) {
      case 'success':
        return {
          icon: CheckCircle,
          backgroundColor: isDark 
            ? `rgba(21, 128, 61, ${baseOpacity})` 
            : `rgba(240, 253, 244, ${baseOpacity})`,
          borderColor: isDark ? '#22C55E' : '#16A34A',
          iconColor: isDark ? '#22C55E' : '#16A34A',
          titleColor: colors.text,
          messageColor: colors.textSecondary,
          shadowColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        };
      case 'error':
        return {
          icon: XCircle,
          backgroundColor: isDark 
            ? `rgba(153, 27, 27, ${baseOpacity})` 
            : `rgba(254, 242, 242, ${baseOpacity})`,
          borderColor: isDark ? '#EF4444' : '#DC2626',
          iconColor: isDark ? '#EF4444' : '#DC2626',
          titleColor: colors.text,
          messageColor: colors.textSecondary,
          shadowColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          backgroundColor: isDark 
            ? `rgba(146, 64, 14, ${baseOpacity})` 
            : `rgba(255, 251, 235, ${baseOpacity})`,
          borderColor: isDark ? '#F59E0B' : '#D97706',
          iconColor: isDark ? '#F59E0B' : '#D97706',
          titleColor: colors.text,
          messageColor: colors.textSecondary,
          shadowColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        };
      case 'network':
        return {
          icon: notification.title.toLowerCase().includes('connected') ? Wifi : WifiOff,
          backgroundColor: isDark 
            ? `rgba(30, 58, 138, ${baseOpacity})` 
            : `rgba(239, 246, 255, ${baseOpacity})`,
          borderColor: isDark ? '#3B82F6' : '#2563EB',
          iconColor: isDark ? '#3B82F6' : '#2563EB',
          titleColor: colors.text,
          messageColor: colors.textSecondary,
          shadowColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        };
      default: // info
        return {
          icon: Info,
          backgroundColor: isDark 
            ? `rgba(55, 48, 163, ${baseOpacity})` 
            : `rgba(238, 242, 255, ${baseOpacity})`,
          borderColor: isDark ? '#6366F1' : '#4F46E5',
          iconColor: isDark ? '#6366F1' : '#4F46E5',
          titleColor: colors.text,
          messageColor: colors.textSecondary,
          shadowColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        };
    }
  };

  const config = getNotificationConfig();
  const IconComponent = config.icon;

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
          shadowColor: config.shadowColor,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.notificationLeft}>
          <View style={[styles.iconContainer, { backgroundColor: config.iconColor + (isDark ? '25' : '15') }]}>
            <IconComponent size={getResponsiveSize(20)} color={config.iconColor} />
          </View>
          
          <View style={styles.textContainer}>
            <Text 
              style={[styles.notificationTitle, { color: config.titleColor }]}
              numberOfLines={isSmallScreen ? 1 : 2}
              ellipsizeMode="tail"
            >
              {notification.title}
            </Text>
            {notification.message && (
              <Text 
                style={[styles.notificationMessage, { color: config.messageColor }]}
                numberOfLines={isSmallScreen ? 2 : 3}
                ellipsizeMode="tail"
              >
                {notification.message}
              </Text>
            )}
          </View>
        </View>

        {!notification.persistent && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={getResponsiveSize(16)} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface NotificationSystemProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <View style={styles.systemContainer} pointerEvents="box-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  systemContainer: {
    position: 'absolute',
    top: getStatusBarHeight() + (isShortScreen ? 8 : 12),
    left: isSmallScreen ? 12 : 16,
    right: isSmallScreen ? 12 : 16,
    zIndex: 9999,
    elevation: 9999,
    maxWidth: isSmallScreen ? undefined : 400,
    alignSelf: 'center',
  },
  notificationContainer: {
    borderRadius: getResponsiveSize(12),
    marginBottom: isSmallScreen ? 6 : 8,
    borderLeftWidth: getResponsiveSize(4),
    shadowOffset: { width: 0, height: isSmallScreen ? 1 : 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0.2,
    shadowRadius: getResponsiveSize(8),
    elevation: Platform.OS === 'android' ? 8 : 0,
    // Backdrop blur effect for better visibility
    ...(Platform.OS === 'ios' && {
      backdropFilter: 'blur(10px)',
    }),
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: getResponsiveSize(14),
    minHeight: getResponsiveSize(60),
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 8,
  },
  iconContainer: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(12),
    marginTop: 2, // Slight alignment adjustment
  },
  textContainer: {
    flex: 1,
    paddingTop: 1, // Better text alignment
  },
  notificationTitle: {
    fontSize: getResponsiveSize(15),
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    marginBottom: 3,
    lineHeight: getResponsiveSize(20),
  },
  notificationMessage: {
    fontSize: getResponsiveSize(13),
    lineHeight: getResponsiveSize(18),
    opacity: 0.9,
  },
  dismissButton: {
    padding: getResponsiveSize(6),
    marginLeft: 4,
    marginTop: -2, // Better alignment with title
    borderRadius: getResponsiveSize(12),
    // Add subtle background for better touch target
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
