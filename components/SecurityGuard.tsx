import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, AppState, DeviceEventEmitter, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import SecurityService from '../services/SecurityService';
import { useCustomAlert } from '../hooks/useCustomAlert';

interface SecurityGuardProps {
  children: React.ReactNode;
  config?: any;
}

interface SecurityState {
  isSecure: boolean;
  isLoading: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: number;
  lastCheck: number;
}

const SecurityGuard: React.FC<SecurityGuardProps> = ({ children, config }) => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecure: true,
    isLoading: true,
    threatLevel: 'low',
    violations: 0,
    lastCheck: 0
  });

  const router = useRouter();
  const { showAlert } = useCustomAlert();
  const securityService = SecurityService.getInstance();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const securityCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const tamperCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeSecurity();
    setupAppStateHandling();
    setupTamperDetection();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeSecurity = async () => {
    try {
      // Check if development mode is enabled
      const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.EXPO_PUBLIC_SECURITY_MODE === 'development';
      
      if (isDevelopment) {
        setSecurityState(prev => ({
          ...prev,
          isSecure: true,
          isLoading: false,
          threatLevel: 'low'
        }));
        return;
      }

      // Perform initial comprehensive security check
      const result = await securityService.performSecurityChecks(config || {});
      
      setSecurityState({
        isSecure: result.isValid && !result.shouldBlock,
        isLoading: false,
        threatLevel: result.threatLevel,
        violations: await securityService.getSecurityViolationCount(),
        lastCheck: Date.now()
      });

      // Handle security violations
      if (result.shouldBlock) {
        await handleSecurityViolation(result);
        return;
      }

      if (result.warnings.length > 0) {
        showSecurityWarnings(result.warnings);
      }

      // Start continuous monitoring
      startContinuousMonitoring();

    } catch (error) {
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        threatLevel: 'medium'
      }));
    }
  };

  const setupAppStateHandling = () => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - perform security check
        await performQuickSecurityCheck();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  };

  const setupTamperDetection = () => {
    // Skip tamper detection in development mode
    const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.EXPO_PUBLIC_SECURITY_MODE === 'development';
    
    if (isDevelopment) {
      return;
    }

    // Set up real-time tamper detection
    tamperCheckInterval.current = setInterval(async () => {
      try {
        const isSecure = await securityService.isAppSecure();
        if (!isSecure) {
          await handleCriticalSecurityBreach();
        }
      } catch (error) {
        // Tamper detection failed - continue monitoring
      }
    }, 30000) as unknown as NodeJS.Timeout; // Check every 30 seconds
  };

  const startContinuousMonitoring = () => {
    // Periodic comprehensive security checks
    securityCheckInterval.current = setInterval(async () => {
      await performPeriodicSecurityCheck();
    }, 5 * 60 * 1000) as unknown as NodeJS.Timeout; // Every 5 minutes
  };

  const performQuickSecurityCheck = async () => {
    try {
      const violations = await securityService.getSecurityViolationCount();
      const isSecure = await securityService.isAppSecure();
      
      setSecurityState(prev => ({
        ...prev,
        isSecure,
        violations,
        lastCheck: Date.now()
      }));

      if (!isSecure) {
        await handleCriticalSecurityBreach();
      }
    } catch (error) {
      // Quick security check failed - continue monitoring
    }
  };

  const performPeriodicSecurityCheck = async () => {
    try {
      const result = await securityService.performSecurityChecks(config || {});
      
      setSecurityState(prev => ({
        ...prev,
        isSecure: result.isValid && !result.shouldBlock,
        threatLevel: result.threatLevel,
        violations: prev.violations,
        lastCheck: Date.now()
      }));

      if (result.shouldBlock) {
        await handleSecurityViolation(result);
      }
    } catch (error) {
      // Periodic security check failed - continue monitoring
    }
  };

  const handleSecurityViolation = async (result: any) => {
    const violationCount = await securityService.getSecurityViolationCount();
    
    if (result.threatLevel === 'critical' || violationCount >= 3) {
      await handleCriticalSecurityBreach();
      return;
    }

    // Show security warning
    showAlert({
      type: 'warning',
      title: 'Security Warning',
      message: `Security threat detected: ${result.errors.join(', ')}. Please ensure you're using the official app version.`,
      buttons: [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    });
  };

  const handleCriticalSecurityBreach = async () => {
    try {
      // Block app functionality
      setSecurityState(prev => ({
        ...prev,
        isSecure: false,
        threatLevel: 'critical'
      }));

      // Show critical security alert
      showAlert({
        type: 'error',
        title: 'Security Breach Detected',
        message: 'Critical security violations detected. The app has been disabled for your protection. Please reinstall the official app from the app store.',
        buttons: [
          {
            text: 'Exit App',
            style: 'destructive',
            onPress: () => {
              // Force close app
              if (typeof window !== 'undefined') {
                window.close();
              }
            }
          }
        ]
      });

    } catch (error) {
      // Critical security breach handling failed
    }
  };

  const showSecurityWarnings = (warnings: string[]) => {
    // Skip showing security warnings in development mode
    const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.EXPO_PUBLIC_SECURITY_MODE === 'development';
    
    if (isDevelopment) {
      return;
    }

    if (warnings.length === 0) return;

    const warningMessage = warnings.join('\n• ');
    showAlert({
      type: 'info',
      title: 'Security Notice',
      message: `Security warnings detected:\n• ${warningMessage}\n\nThe app will continue to function but some features may be limited.`,
      buttons: [
        {
          text: 'Understood',
          style: 'default'
        }
      ]
    });
  };

  const cleanup = () => {
    if (securityCheckInterval.current) {
      clearInterval(securityCheckInterval.current);
      securityCheckInterval.current = null;
    }
    if (tamperCheckInterval.current) {
      clearInterval(tamperCheckInterval.current);
      tamperCheckInterval.current = null;
    }
  };

  // Skip security UI in development mode
  const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.EXPO_PUBLIC_SECURITY_MODE === 'development';
  
  if (isDevelopment) {
    return <>{children}</>;
  }

  // Render security status or blocked screen
  if (securityState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing Security...</Text>
      </View>
    );
  }

  if (!securityState.isSecure && securityState.threatLevel === 'critical') {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>🔒 Security Protection Active</Text>
        <Text style={styles.blockedMessage}>
          This app has been disabled due to security violations.
          Please reinstall the official app from the app store.
        </Text>
        <Text style={styles.violationCount}>
          Security Violations: {securityState.violations}
        </Text>
      </View>
    );
  }

  // Render app with security monitoring active
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  blockedTitle: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  blockedMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  violationCount: {
    color: '#ff8888',
    fontSize: 14,
    fontWeight: '600',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 5,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default SecurityGuard;
