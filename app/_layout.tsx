import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import { AlertProvider } from '../contexts/AlertContext';
import { NetworkProvider } from '../services/NetworkHandler';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';
import { NotificationSystem } from '../components/NotificationSystem';
import ConfigLoader from '../components/ConfigLoader';

function RootStack() {
  const { colors, isDark } = useTheme();
  const { notifications, dismissNotification } = useNotification();
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
          animationDuration: 200
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="become-vip" />
        <Stack.Screen name="buy-coins" />
        <Stack.Screen name="configure-ads" />
        <Stack.Screen name="report-problem" />
        <Stack.Screen name="rate-us" />
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
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ConfigProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AlertProvider>
            <NetworkProvider>
              <AuthProvider>
                <ConfigLoader>
                  <RootStack />
                </ConfigLoader>
              </AuthProvider>
            </NetworkProvider>
          </AlertProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}
