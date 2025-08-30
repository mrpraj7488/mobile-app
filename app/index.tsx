import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive sizes based on both width and height
const baseWidth = 375; // iPhone 6/7/8 width
const baseHeight = 667; // iPhone 6/7/8 height

// Use the smaller scale factor to ensure content fits on screen
const widthScale = screenWidth / baseWidth;
const heightScale = screenHeight / baseHeight;
const scale = Math.min(widthScale, heightScale, 1.5); // Increased cap to 1.5x for better visibility

// Responsive sizing function
const responsiveSize = (size: number) => {
  return Math.round(size * scale);
};

// Responsive font size with platform-specific adjustments
const responsiveFont = (size: number) => {
  const fontSize = size * scale;
  // Android tends to render fonts larger
  return Platform.OS === 'android' ? fontSize * 0.95 : fontSize;
};

// Wrapper component that handles auth context safely
function SplashScreenContent() {
  const { user, profile, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  // Logo and text animation with staggered timing
  useEffect(() => {
    // Single smooth animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Smooth loading indicator
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Add smooth transition delay
      const timer = setTimeout(() => {
        if (user && profile) {
          router.replace('/(tabs)');
        } else if (user && !profile) {
          // Give profile loading more time for new users (especially Google Auth)
          const profileTimer = setTimeout(() => {
            // Proceed to app even if profile isn't loaded yet
            router.replace('/(tabs)');
          }, 3000); // Increased timeout for Google Auth profile creation
          return () => clearTimeout(profileTimer);
        } else if (!user) {
          router.replace('/(auth)/login');
        }
      }, 800); // Smooth transition delay
      
      return () => clearTimeout(timer);
    }
  }, [user, profile, loading, router]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate logo size based on screen dimensions - increased sizes
  const logoSize = responsiveSize(140); // Increased from 100
  const dotTranslate = responsiveSize(15); // Increased from 12

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#FFFFFF']}
      style={styles.container}
    >
      <View style={styles.contentWrapper}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Image 
            source={require('../assets/images/flash-icon.png')} 
            style={[
              styles.logo,
              {
                width: logoSize,
                height: logoSize,
                marginBottom: responsiveSize(20), // Increased from 15
              }
            ]}
            resizeMode="contain"
          />
          
          <Animated.Text style={[
            styles.appName, 
            { 
              opacity: textFadeAnim,
              color: isDark ? 'white' : '#1E293B',
              fontSize: responsiveFont(36), // Increased from 28
              marginBottom: responsiveSize(35), // Increased from 25
            }
          ]}>
            VidGro
          </Animated.Text>
          
          <Animated.View style={[styles.loadingContainer, { opacity: textFadeAnim }]}>
            <Animated.View style={[
              styles.loadingIndicator, 
              { 
                width: responsiveSize(45), // Increased from 35
                height: responsiveSize(45), // Increased from 35
                marginBottom: responsiveSize(16), // Increased from 12
                transform: [{ rotate: spin }] 
              }
            ]}>
              <View style={[
                styles.loadingDot, 
                { 
                  width: responsiveSize(8), // Increased from 6
                  height: responsiveSize(8), // Increased from 6
                  borderRadius: responsiveSize(4), // Increased from 3
                  backgroundColor: isDark ? 'white' : '#1E293B',
                  transform: [{ translateY: -dotTranslate }]
                }
              ]} />
              <View style={[
                styles.loadingDot, 
                { 
                  width: responsiveSize(8),
                  height: responsiveSize(8),
                  borderRadius: responsiveSize(4),
                  backgroundColor: isDark ? 'white' : '#1E293B',
                  transform: [
                    { rotate: '120deg' },
                    { translateY: -dotTranslate }
                  ]
                }
              ]} />
              <View style={[
                styles.loadingDot, 
                { 
                  width: responsiveSize(8),
                  height: responsiveSize(8),
                  borderRadius: responsiveSize(4),
                  backgroundColor: isDark ? 'white' : '#1E293B',
                  transform: [
                    { rotate: '240deg' },
                    { translateY: -dotTranslate }
                  ]
                }
              ]} />
            </Animated.View>
            <Animated.Text style={[
              styles.loadingText, 
              { 
                color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.7)',
                fontSize: responsiveFont(15), // Increased from 13
              }
            ]}>
              Loading...
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

// Error boundary wrapper for the splash screen
export default function SplashScreen() {
  const [hasError, setHasError] = useState(false);

  // Fallback UI if auth context is not available - respects system theme
  if (hasError) {
    const systemIsDark = true; // Default to dark for error fallback
    return (
      <LinearGradient
        colors={systemIsDark ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#FFFFFF']}
        style={styles.container}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
            <Image 
              source={require('../assets/images/flash-icon.png')} 
              style={[styles.logo, { width: 120, height: 120, marginBottom: 20 }]}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { 
              color: systemIsDark ? 'white' : '#1E293B', 
              fontSize: 32, 
              marginBottom: 30 
            }]}>
              VidGro
            </Text>
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { 
                color: systemIsDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.7)', 
                fontSize: 14 
              }]}>
                Initializing...
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  try {
    return <SplashScreenContent />;
  } catch (error) {
    setHasError(true);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    // Dimensions set inline for responsiveness
  },
  appName: {
    fontWeight: '800', // Increased from 700
    letterSpacing: 1.5, // Increased from 1.2
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Increased shadow
    textShadowOffset: { width: 0, height: 2 }, // Increased offset
    textShadowRadius: 4, // Increased radius
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: responsiveSize(8), // Increased from 5
  },
  loadingIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    position: 'absolute',
    opacity: 1, // Increased from 0.9
  },
  loadingText: {
    letterSpacing: 0.8, // Increased from 0.5
    fontWeight: '600', // Increased from 500
  },
});