import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface AppInitializerProps {
  children: React.ReactNode;
  isReady: boolean;
}

// Keep splash screen visible during app initialization
SplashScreen.preventAutoHideAsync();

export default function AppInitializer({ children, isReady }: AppInitializerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasHiddenSplash = useRef(false);

  useEffect(() => {
    if (isReady && !hasHiddenSplash.current) {
      hasHiddenSplash.current = true;
      
      // Start fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        // Hide splash screen after animation completes
        SplashScreen.hideAsync();
      });
    }
  }, [isReady, fadeAnim]);

  if (!isReady) {
    return null; // Keep showing splash screen
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
}
