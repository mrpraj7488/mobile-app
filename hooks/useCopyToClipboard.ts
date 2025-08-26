import { useState } from 'react';
import { Clipboard, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSharedValue, withTiming } from 'react-native-reanimated';

interface UseCopyToClipboardReturn {
  copied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
  opacity: any; // Animated.SharedValue<number>
}

export const useCopyToClipboard = (): UseCopyToClipboardReturn => {
  const [copied, setCopied] = useState(false);
  const opacity = useSharedValue(0);

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      Clipboard.setString(text);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Show success indicator
      setCopied(true);
      opacity.value = withTiming(1, { duration: 200 });
      
      // Hide after 2 seconds
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        setTimeout(() => setCopied(false), 200);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return {
    copied,
    copyToClipboard,
    opacity,
  };
};
