import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

interface ScreenHeaderProps {
  title: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export default function ScreenHeader({ 
  title, 
  icon: Icon, 
  onBackPress,
  rightComponent 
}: ScreenHeaderProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  // Fixed status bar height calculation
  const statusBarHeight = React.useMemo(() => {
    return Platform.OS === 'ios' 
      ? (isTablet ? 60 : 50) 
      : (StatusBar.currentHeight || 0) + (isTablet ? 20 : 16);
  }, []);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const styles = getScreenHeaderStyles(statusBarHeight);

  return (
    <LinearGradient
      colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={isSmallScreen ? 26 : isTablet ? 32 : 28} color="white" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[
            styles.headerTitle,
            { fontSize: isSmallScreen ? 20 : isTablet ? 28 : 24 }
          ]}>
            {title}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : Icon ? (
            <Icon size={isSmallScreen ? 26 : isTablet ? 32 : 28} color="white" />
          ) : (
            <View style={styles.placeholderIcon} />
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const getScreenHeaderStyles = (statusBarHeight: number) => StyleSheet.create({
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
  backButton: {
    padding: isSmallScreen ? 8 : isTablet ? 10 : 8,
    width: isSmallScreen ? 40 : isTablet ? 48 : 44,
    height: isSmallScreen ? 40 : isTablet ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isSmallScreen ? 20 : isTablet ? 24 : 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: isSmallScreen ? 16 : isTablet ? 20 : 18,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rightSection: {
    minWidth: isSmallScreen ? 40 : isTablet ? 48 : 44,
    height: isSmallScreen ? 40 : isTablet ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  placeholderIcon: {
    width: isSmallScreen ? 26 : isTablet ? 32 : 28,
    height: isSmallScreen ? 26 : isTablet ? 32 : 28,
  },
});
