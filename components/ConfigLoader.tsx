import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useConfig } from '@/contexts/ConfigContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ConfigLoaderProps {
  children: React.ReactNode;
}

export default function ConfigLoader({ children }: ConfigLoaderProps) {
  const { config, loading, error, isConfigValid, refreshConfig } = useConfig();
  const [forceRender, setForceRender] = useState(false);

  // Fast timeout to prevent blocking
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceRender(true);
    }, 1000); // Reduced to 1s for faster loading

    return () => clearTimeout(timeout);
  }, []);

  // Immediately render if config is ready or timeout reached
  if (forceRender || (config && isConfigValid) || !loading) {
    return <>{children}</>;
  }

  // Only show error screen if there's an actual error after loading
  if (!loading && (error || !isConfigValid)) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Configuration Error</Text>
            <Text style={styles.errorText}>
              {error || 'Invalid configuration received'}
            </Text>
            
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryButton} onPress={() => refreshConfig()}>
                <RefreshCw size={16} color="#4A90E2" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Don't show any loading screen - let the main splash handle it
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#B8C5D6',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorActions: {
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
});