import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Dimensions } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const slideX = useSharedValue(isDark ? 24 : 0);
  const colorProgress = useSharedValue(isDark ? 1 : 0);
  const glowOpacity = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    // Animate color transition
    colorProgress.value = withTiming(isDark ? 1 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    
    // Animate slide transition
    slideX.value = withTiming(isDark ? 20 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    
    // Enhanced rotation animation
    rotation.value = withTiming(isDark ? 360 : 0, {
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    // Icon scale animation for smooth transition
    iconScale.value = withSequence(
      withTiming(0.8, { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      withTiming(1, { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    );

    // Glow effect for dark mode
    glowOpacity.value = withTiming(isDark ? 1 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isDark]);

  const handleToggle = () => {
    // Haptic feedback (only on native platforms)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Enhanced scale animation for press feedback
    scale.value = withSequence(
      withSpring(0.85, { damping: 20, stiffness: 400 }),
      withSpring(1.05, { damping: 20, stiffness: 400 }),
      withSpring(1, { damping: 20, stiffness: 400 })
    );

    toggleTheme();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.2)', 'rgba(74, 144, 226, 0.25)']
    );

    const borderColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.3)', 'rgba(74, 144, 226, 0.4)']
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: scale.value }],
    };
  });

  const sliderAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#FFD700', '#4A90E2']
    );

    return {
      transform: [
        { translateX: slideX.value },
        { scale: iconScale.value },
        { rotate: `${rotation.value}deg` }
      ],
      backgroundColor,
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value * 0.6,
      transform: [{ scale: 1 + glowOpacity.value * 0.1 }],
    };
  });

  const iconColor = isDark ? '#4A90E2' : '#FFD700';

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {isDark && (
          <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />
        )}
        <View style={styles.track}>
          <Animated.View style={[styles.slider, sliderAnimatedStyle]}>
            {isDark ? (
              <Moon size={12} color="white" fill="white" />
            ) : (
              <Sun size={12} color={iconColor} fill={iconColor} />
            )}
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 15,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
  },
  track: {
    flex: 1,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    top: 1,
    left: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});