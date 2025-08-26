import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useSecurityMonitor } from '../hooks/useSecurityMonitor';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react-native';

interface SystemStatus {
  configLoaded: boolean;
  securityValid: boolean;
  adBlockDetected: boolean;
  servicesInitialized: boolean;
}

export default function BalanceSystemMonitor() {
  const { user, profile } = useAuth();
  const { config, isConfigValid, securityReport } = useConfig();
  const { securityStatus } = useSecurityMonitor();
  const { colors, isDark } = useTheme();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    configLoaded: false,
    securityValid: true,
    adBlockDetected: false,
    servicesInitialized: false,
  });

  useEffect(() => {
    updateSystemStatus();
  }, [config, isConfigValid, securityStatus, securityReport]);

  const updateSystemStatus = () => {
    setSystemStatus({
      configLoaded: isConfigValid && config !== null,
      securityValid: securityStatus.deviceSecure && securityStatus.appIntegrityValid,
      adBlockDetected: securityStatus.adBlockDetected,
      servicesInitialized: config?.features ? Object.values(config.features).some(Boolean) : false,
    });
  };

  // Only show in development or when there are issues
  const shouldShow = __DEV__ || 
    !systemStatus.configLoaded || 
    !systemStatus.securityValid || 
    systemStatus.adBlockDetected;

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Shield size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>System Status</Text>
      </View>
      
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          {systemStatus.configLoaded ? (
            <CheckCircle size={12} color={colors.success} />
          ) : (
            <AlertTriangle size={12} color={colors.error} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Config: {systemStatus.configLoaded ? 'Loaded' : 'Failed'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {systemStatus.securityValid ? (
            <CheckCircle size={12} color={colors.success} />
          ) : (
            <AlertTriangle size={12} color={colors.warning} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Security: {systemStatus.securityValid ? 'Valid' : 'Warning'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {systemStatus.adBlockDetected ? (
            <EyeOff size={12} color={colors.error} />
          ) : (
            <Eye size={12} color={colors.success} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Ads: {systemStatus.adBlockDetected ? 'Blocked' : 'Active'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          {systemStatus.servicesInitialized ? (
            <CheckCircle size={12} color={colors.success} />
          ) : (
            <AlertTriangle size={12} color={colors.warning} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Services: {systemStatus.servicesInitialized ? 'Ready' : 'Loading'}
          </Text>
        </View>
      </View>
      
      {securityStatus.securityWarnings.length > 0 && (
        <View style={styles.warningsSection}>
          <Text style={[styles.warningsTitle, { color: colors.warning }]}>
            Security Warnings:
          </Text>
          {securityStatus.securityWarnings.slice(0, 2).map((warning, index) => (
            <Text key={index} style={[styles.warningItem, { color: colors.warning }]}>
              • {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 25 : 50,
    right: 10,
    maxWidth: 200,
    borderRadius: 8,
    padding: 8,
    opacity: 0.9,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusGrid: {
    gap: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '500',
  },
  warningsSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningsTitle: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  warningItem: {
    fontSize: 8,
    lineHeight: 12,
  },
});
