import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  X,
  AlertTriangle 
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CustomAlert({
  visible,
  type,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  autoClose = false,
  autoCloseDelay = 3000,
}: CustomAlertProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  console.log('🎨 CustomAlert render:', { visible, type, title, message });

  React.useEffect(() => {
    if (visible && !isAnimating) {
      setIsAnimating(true);
      // Reset values first
      opacity.value = 0;
      scale.value = 0;
      
      // Animate in
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      }, () => {
        runOnJS(setIsAnimating)(false);
      });

      if (autoClose && type !== 'confirm') {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    } else if (!visible && isAnimating) {
      // Only animate out if we were animating in
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsAnimating)(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    if (isAnimating) return; // Prevent multiple close calls during animation
    
    setIsAnimating(true);
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setIsAnimating)(false);
      if (onClose) {
        runOnJS(onClose)();
      }
    });
  };

  const handleButtonPress = (button: AlertButton) => {
    if (isAnimating) return; // Prevent button presses during animation
    
    handleClose();
    // Execute button action after starting close animation
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 150);
    }
  };

  const getIcon = () => {
    const iconSize = isSmallScreen ? 28 : 32;
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color={colors.success} />;
      case 'error':
        return <XCircle size={iconSize} color={colors.error} />;
      case 'warning':
        return <AlertTriangle size={iconSize} color={colors.warning} />;
      case 'info':
        return <Info size={iconSize} color={colors.primary} />;
      case 'confirm':
        return <AlertCircle size={iconSize} color={colors.primary} />;
      default:
        return <Info size={iconSize} color={colors.primary} />;
    }
  };

  const getGradientColors = (): [string, string] => {
    switch (type) {
      case 'success':
        return isDark 
          ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']
          : ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'];
      case 'error':
        return isDark
          ? ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']
          : ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)'];
      case 'warning':
        return isDark
          ? ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)']
          : ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)'];
      default:
        return isDark
          ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)']
          : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)'];
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const alertStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Don't render if not visible and not animating
  if (!visible && !isAnimating) {
    console.log('🎨 CustomAlert: Not rendering - visible:', visible, 'isAnimating:', isAnimating);
    return null;
  }

  console.log('🎨 CustomAlert: Rendering alert - visible:', visible, 'isAnimating:', isAnimating);

  return (
    <AnimatedView style={[styles.overlay, overlayStyle]}>
      <AnimatedTouchableOpacity 
        style={styles.overlayTouch}
        activeOpacity={1}
        onPress={type !== 'confirm' && !isAnimating ? handleClose : undefined}
      />
        
        <AnimatedView style={[styles.alertContainer, alertStyle]}>
          <LinearGradient
            colors={getGradientColors()}
            style={styles.alertGradient}
          >
            <View style={[styles.alert, { backgroundColor: colors.surface }]}>
              {/* Close button for non-confirm alerts */}
              {type !== 'confirm' && (
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={!isAnimating ? handleClose : undefined}
                  disabled={isAnimating}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* Icon */}
              <View style={styles.iconContainer}>
                {getIcon()}
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {message}
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      {
                        backgroundColor: button.style === 'destructive' 
                          ? colors.error 
                          : button.style === 'cancel'
                          ? colors.border
                          : colors.primary,
                        marginLeft: index > 0 ? 12 : 0,
                        opacity: isAnimating ? 0.6 : 1,
                      }
                    ]}
                    onPress={() => handleButtonPress(button)}
                    disabled={isAnimating}
                  >
                    <Text style={[
                      styles.buttonText,
                      {
                        color: button.style === 'cancel' ? colors.text : 'white',
                      }
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  alertContainer: {
    width: '100%',
    maxWidth: isSmallScreen ? 280 : 320,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  alertGradient: {
    borderRadius: 16,
    padding: 2,
  },
  alert: {
    borderRadius: 14,
    padding: isSmallScreen ? 20 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 10001,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: isSmallScreen ? 24 : 26,
  },
  message: {
    fontSize: isSmallScreen ? 14 : 16,
    textAlign: 'center',
    lineHeight: isSmallScreen ? 20 : 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
});
