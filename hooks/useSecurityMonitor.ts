import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import SecurityService from '../services/SecurityService';
import AdService from '../services/AdService';
import { useConfig } from '../contexts/ConfigContext';

interface SecurityStatus {
  deviceSecure: boolean;
  adBlockDetected: boolean;
  appIntegrityValid: boolean;
  lastSecurityCheck: Date | null;
  securityWarnings: string[];
}

export function useSecurityMonitor() {
  const { config } = useConfig();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    deviceSecure: true,
    adBlockDetected: false,
    appIntegrityValid: true,
    lastSecurityCheck: null,
    securityWarnings: [],
  });

  useEffect(() => {
    if (config) {
      performSecurityCheck();
      
      // Set up periodic security monitoring
      const interval = setInterval(performSecurityCheck, 5 * 60 * 1000); // Every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [config]);

  const performSecurityCheck = async () => {
    try {
      const securityService = SecurityService.getInstance();
      const adService = AdService.getInstance();
      
      // Perform comprehensive security check
      const securityResult = await securityService.performSecurityChecks(config);
      const adBlockStatus = adService.getAdBlockStatus();
      
      const newStatus: SecurityStatus = {
        deviceSecure: securityResult.isValid,
        adBlockDetected: adBlockStatus.detected,
        appIntegrityValid: securityResult.errors.length === 0,
        lastSecurityCheck: new Date(),
        securityWarnings: [...securityResult.warnings, ...securityResult.errors],
      };
      
      setSecurityStatus(newStatus);
      
      // Handle security violations
      if (!newStatus.deviceSecure && config?.security.allowRooted === false) {
        handleSecurityViolation('Device security compromised');
      }
      
      if (newStatus.adBlockDetected && config?.security.adBlockDetection) {
        handleAdBlockDetection();
      }
      
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  };

  const handleSecurityViolation = (reason: string) => {
    console.warn('🔒 Security violation detected:', reason);
    // Security violations handled silently to avoid disrupting user experience
  };

  const handleAdBlockDetection = () => {
    console.warn('🚫 Ad blocking detected by security monitor');
    // Ad block detection handled silently to avoid disrupting user experience
  };

  const forceSecurityCheck = async () => {
    await performSecurityCheck();
  };

  const getSecurityReport = () => {
    const securityService = SecurityService.getInstance();
    return securityService.getSecurityReport();
  };

  return {
    securityStatus,
    forceSecurityCheck,
    getSecurityReport,
  };
}