import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar, Image } from 'react-native';
import { Menu, X, User, Share2, Shield, FileText, Globe, Settings, MessageCircle, HelpCircle, LogOut, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface GlobalHeaderProps {
  title: string;
  showCoinDisplay?: boolean;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
}

export default function GlobalHeader({ 
  title, 
  showCoinDisplay = true,
  menuVisible, 
  setMenuVisible 
}: GlobalHeaderProps) {
  const { profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  // Fixed status bar height calculation to prevent layout shifts
  const statusBarHeight = React.useMemo(() => {
    return Platform.OS === 'ios' 
      ? (isTablet ? 60 : 50) 
      : (StatusBar.currentHeight || 0) + (isTablet ? 20 : 16);
  }, []);

  // Memoize styles to prevent recreation on each render
  const styles = React.useMemo(() => getHeaderStyles(statusBarHeight), [statusBarHeight]);

  // Animation values
  const menuScale = useSharedValue(1);
  const coinScale = useSharedValue(1);

  const sideMenuItems = [
    { icon: Share2, title: 'Refer a Friend', route: '/refer-friend' },
    { icon: Shield, title: 'Privacy Policy', route: '/privacy-policy' },
    { icon: FileText, title: 'Terms of Service', route: '/terms' },
    { icon: Globe, title: 'Languages', route: '/languages' },
    { icon: MessageCircle, title: 'Contact Support', route: '/contact-support' },
    { icon: HelpCircle, title: 'FAQ', route: '/faq' },
    { icon: LogOut, title: 'Log Out', action: 'logout', color: '#E74C3C' },
    { icon: Trash2, title: 'Delete Account', route: '/delete-account', color: '#E74C3C' },
  ];

  const handleItemPress = async (item: any) => {
    if (item.action === 'logout') {
      await handleLogout();
    } else if (item.route) {
      // Close menu first, then navigate with delay
      setMenuVisible(false);
      setTimeout(() => {
        router.push(item.route);
      }, 100);
    }
  };

  const handleEditProfile = () => {
    // Ensure menu is closed immediately and state is reset
    setMenuVisible(false);
    // Add small delay to ensure state update before navigation
    setTimeout(() => {
      router.push('/edit-profile');
    }, 100);
  };

  const handleLogout = async (): Promise<void> => {
    setMenuVisible(false);
    
    try {
      await signOut();
      // Let AuthContext handle navigation via auth state change
    } catch (error) {
      // Fallback navigation if signOut fails
      router.replace('/(auth)/login');
    }
  };

  const handleMenuPress = () => {
    menuScale.value = withSpring(0.9, { damping: 15, stiffness: 400 }, () => {
      menuScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
    setMenuVisible(!menuVisible);
  };

  const handleCoinPress = () => {
    coinScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
      coinScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

  const renderSideMenu = () => (
    <View style={[
      styles.sideMenu, 
      { 
        left: menuVisible ? 0 : -Math.min(300, screenWidth * 0.8), 
        backgroundColor: colors.surface,
        width: Math.min(280, screenWidth * 0.85)
      }
    ]}>
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
        style={styles.sideMenuHeader}
      >
        <View style={styles.sideMenuHeaderContent}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={[styles.profileAvatar, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.25)' : 'rgba(255, 255, 255, 0.25)' }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              {profile?.avatar_url ? (
                <Image 
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  defaultSource={require('@/assets/images/icon.png')}
                />
              ) : (
                <User size={isSmallScreen ? 28 : isTablet ? 40 : 36} color="white" />
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
                <Text style={[
                  styles.profileName, 
                  { 
                    color: 'white',
                    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20
                  }
                ]} numberOfLines={1}>
                  {profile?.username || 'User'}
                </Text>
                <Text style={[
                  styles.profileEmail, 
                  { 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: isSmallScreen ? 15 : isTablet ? 18 : 16
                  }
                ]} numberOfLines={1}>
                  {profile?.email || 'user@example.com'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={handleEditProfile}
            >
              <Edit3 size={isSmallScreen ? 22 : isTablet ? 28 : 24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      <View style={[styles.sideMenuContent, { backgroundColor: colors.surface }]}>
        {/* Dark Mode Toggle Section - Moved above Refer a Friend */}
        <View style={[styles.themeSection, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(128, 0, 128, 0.1)', borderBottomColor: colors.border }]}>
          <View style={styles.themeSectionContent}>
            <Text style={[styles.themeLabel, { 
              color: colors.text,
              fontSize: isSmallScreen ? 17 : isTablet ? 20 : 18
            }]}>🌙 Dark Mode</Text>
            <ThemeToggle />
          </View>
        </View>

        {/* Menu Items */}
        {sideMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sideMenuItem, 
              { 
                borderBottomColor: colors.border,
                paddingVertical: isSmallScreen ? 14 : isTablet ? 18 : 16
              }
            ]}
            onPress={() => handleItemPress(item)}
          >
            <item.icon size={isSmallScreen ? 20 : isTablet ? 26 : 22} color={item.color || colors.primary} />
            <Text style={[
              styles.sideMenuText, 
              { 
                color: item.color || colors.text,
                fontSize: isSmallScreen ? 15 : isTablet ? 18 : 16
              }
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Simplified App Version at the bottom - Responsive */}
        <View style={[styles.versionSection, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(128, 0, 128, 0.1)', borderTopColor: colors.border }]}>
          <Text style={[
            styles.appName, 
            { 
              color: colors.text,
              fontSize: isSmallScreen ? 20 : isTablet ? 28 : 24
            }
          ]}>
            VidGro
          </Text>
          <Text style={[
            styles.appVersion, 
            { 
              color: colors.textSecondary,
              fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14
            }
          ]}>
            Version 1.0.0
          </Text>
        </View>
      </View>
    </View>
  );

  
  return (
    <>
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <AnimatedTouchableOpacity 
              style={[styles.menuButton, menuAnimatedStyle]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Menu size={isSmallScreen ? 26 : isTablet ? 32 : 28} color="white" />
            </AnimatedTouchableOpacity>
            <Text style={[
              styles.brandTitle,
              { fontSize: isSmallScreen ? 26 : isTablet ? 32 : 28 }
            ]}>
              VidGro
            </Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && (
              <AnimatedTouchableOpacity 
                style={[styles.coinDisplay, coinAnimatedStyle]}
                onPress={handleCoinPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(74, 144, 226, 0.3)', 'rgba(74, 144, 226, 0.15)'] : ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                  style={[styles.coinBadge, {
                    borderColor: isDark ? 'rgba(74, 144, 226, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                    paddingHorizontal: isSmallScreen ? 10 : isTablet ? 16 : 12,
                    paddingVertical: isSmallScreen ? 8 : isTablet ? 10 : 8
                  }]}
                >
                  <Text style={[styles.coinIcon, { fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18 }]}>🪙</Text>
                  <Text style={[
                    styles.coinText,
                    { fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18 }
                  ]}>
                    {profile?.coins?.toLocaleString() || '0'}
                  </Text>
                </LinearGradient>
              </AnimatedTouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
      
      {renderSideMenu()}
      
      {menuVisible && (
        <TouchableOpacity 
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        />
      )}
    </>
  );
}

const getHeaderStyles = (statusBarHeight: number) => StyleSheet.create({
  header: {
    paddingTop: statusBarHeight,
    paddingBottom: isSmallScreen ? 16 : isTablet ? 20 : 18,
    paddingHorizontal: isSmallScreen ? 18 : isTablet ? 28 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: isSmallScreen ? 48 : isTablet ? 56 : 52,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuButton: {
    marginRight: isSmallScreen ? 10 : isTablet ? 16 : 14,
    padding: isSmallScreen ? 6 : isTablet ? 8 : 6,
    width: isSmallScreen ? 36 : isTablet ? 44 : 40,
    height: isSmallScreen ? 36 : isTablet ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isSmallScreen ? 18 : isTablet ? 22 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  brandTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
    flex: 1,
    fontSize: isSmallScreen ? 30 : isTablet ? 42 : 38,
  },
  coinDisplay: {
    flexShrink: 0,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    overflow: 'hidden',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    borderWidth: 1,
    minWidth: isSmallScreen ? 60 : isTablet ? 80 : 70,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coinIcon: {
    marginRight: isSmallScreen ? 4 : isTablet ? 6 : 5,
  },
  coinText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  sideMenuHeader: {
    paddingTop: statusBarHeight,
    paddingBottom: isSmallScreen ? 18 : isTablet ? 24 : 20,
    paddingHorizontal: isSmallScreen ? 18 : isTablet ? 28 : 24,
  },
  sideMenuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexShrink: 0,
  },
  editButton: {
    padding: isSmallScreen ? 8 : isTablet ? 10 : 8,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    width: isSmallScreen ? 36 : isTablet ? 44 : 40,
    height: isSmallScreen ? 36 : isTablet ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  themeSection: {
    paddingHorizontal: isSmallScreen ? 14 : isTablet ? 20 : 16,
    paddingVertical: isSmallScreen ? 12 : isTablet ? 16 : 14,
    borderBottomWidth: 1,
  },
  themeSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabel: {
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: isSmallScreen ? 44 : isTablet ? 56 : 48,
    height: isSmallScreen ? 44 : isTablet ? 56 : 48,
    borderRadius: isSmallScreen ? 22 : isTablet ? 28 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 10 : isTablet ? 14 : 12,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallScreen ? 22 : isTablet ? 28 : 24,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileEmail: {
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 14 : isTablet ? 20 : 16,
    borderBottomWidth: 1,
  },
  sideMenuText: {
    marginLeft: isSmallScreen ? 12 : isTablet ? 16 : 14,
    fontWeight: '500',
  },
  versionSection: {
    marginTop: 'auto',
    paddingTop: isSmallScreen ? 12 : isTablet ? 16 : 14,
    paddingHorizontal: isSmallScreen ? 14 : isTablet ? 20 : 16,
    paddingBottom: isSmallScreen ? 12 : isTablet ? 16 : 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  appName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appVersion: {
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});