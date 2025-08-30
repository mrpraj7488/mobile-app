import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import { AlertProvider } from '../contexts/AlertContext';
import { NetworkProvider } from '../services/NetworkHandler';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';
import { NotificationSystem } from '../components/NotificationSystem';
import ConfigLoader from '../components/ConfigLoader';
import SecurityGuard from '../components/SecurityGuard';
import AppInitializer from '../components/AppInitializer';

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
          animationDuration: 300
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade', animationDuration: 250 }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 250 }} />
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
