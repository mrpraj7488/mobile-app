import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, useColorScheme, Platform } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { AlertProvider } from '../contexts/AlertContext';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { NetworkProvider } from '../services/NetworkHandler';
import AppInitializer from '../components/AppInitializer';
import { NotificationSystem } from '../components/NotificationSystem';
import ConfigLoader from '../components/ConfigLoader';
import SecurityGuard from '../components/SecurityGuard';

function RootStack() {
  const { colors, isDark } = useTheme();
  const { notifications, dismissNotification } = useNotification();
  const { config, loading } = useConfig();
  
  return (
    <AppInitializer isReady={!loading && !!config}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
          animationDuration: 150,
          statusBarStyle: isDark ? 'light' : 'dark',
          statusBarBackgroundColor: colors.background
        }}
      >
        <Stack.Screen name="index" options={{ 
          animation: 'none',
          contentStyle: { backgroundColor: colors.background }
        }} />
        <Stack.Screen name="(auth)" options={{ 
          animation: 'fade', 
          animationDuration: 120,
          contentStyle: { backgroundColor: colors.background }
        }} />
        <Stack.Screen name="(tabs)" options={{ 
          animation: 'fade', 
          animationDuration: 120,
          contentStyle: { backgroundColor: colors.background }
        }} />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="become-vip" />
        <Stack.Screen name="buy-coins" />
        <Stack.Screen name="configure-ads" />
        <Stack.Screen name="report-problem" />
        <Stack.Screen name="refer-friend" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="languages" />
        <Stack.Screen name="contact-support" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="edit-video" />
        <Stack.Screen name="ticket-detail" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    </AppInitializer>
  );
}

const securityConfig = {
  security: {
    allowRooted: false,
    allowEmulators: false,
    requireSignatureValidation: true,
    enableTamperDetection: true,
    enableVersionProtection: true,
    enableCoinProtection: true,
    enableAdBlockDetection: true,
    maxViolations: 3
  },
  app: {
    environment: __DEV__ ? 'development' : 'production',
    bundleId: 'com.vidgro.app',
    minimumVersion: '1.0.0'
  }
};

export default function RootLayout() {

  return (
    <ConfigProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AlertProvider>
            <NetworkProvider>
              <AuthProvider>
                <SecurityGuard config={securityConfig}>
                  <ConfigLoader>
                    <RootStack />
                  </ConfigLoader>
                </SecurityGuard>
              </AuthProvider>
            </NetworkProvider>
          </AlertProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
