import { Tabs } from 'expo-router';
import { Play, TrendingUp, ChartBar as BarChart3, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Platform, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  // Subtle shadow/scale on press for tab buttons
  const TabButtonContainer = (props: any) => {
    const { children, accessibilityRole, accessibilityState, accessibilityLabel, testID, onPress, onLongPress, disabled, style } = props;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // Static, platform-specific shadow (do not reference Platform inside worklet)
    const baseShadowStyle = Platform.OS === 'ios'
      ? {
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 10,
        }
      : {
          elevation: 6,
        } as const;

    const onPressIn = () => {
      scale.value = withTiming(1.04, { duration: 120 });
    };
    const onPressOut = () => {
      scale.value = withTiming(1, { duration: 180 });
    };

    return (
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={style}
      >
        <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, baseShadowStyle, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  };

  // Authentication guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  // Don't render tabs if user is not authenticated
  if (loading) {
    return null; // Let the ConfigLoader handle the loading state
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? colors.tabBarBackground : colors.tabBarBackground,
            borderTopWidth: 0, // Remove the hard line
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 85 : 70,
            position: 'relative',
            shadowColor: isDark ? colors.shadowColor : colors.shadowColor,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          },
          tabBarActiveTintColor: isDark ? colors.primary : colors.primary,
          tabBarInactiveTintColor: isDark ? colors.textSecondary : colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          tabBarIconStyle: { marginTop: Platform.OS === 'ios' ? 4 : 2 },
          tabBarButton: (props) => (
            <TabButtonContainer {...props} />
          ),
          tabBarBackground: () => (
            <View style={{ flex: 1, position: 'relative' }}>
              
              {/* Tab bar background */}
              <LinearGradient
                colors={isDark 
                  ? [colors.tabBarBackground, 'rgba(10, 14, 26, 0.98)']
                  : [colors.tabBarBackground, 'rgba(250, 250, 250, 0.98)']
                }
                style={{ flex: 1 }}
              />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'View',
            tabBarIcon: ({ size, color }) => (
              <Play size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="promote"
          options={{
            title: 'Promote',
            tabBarIcon: ({ size, color }) => (
              <TrendingUp size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ size, color }) => (
              <MoreHorizontal size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
