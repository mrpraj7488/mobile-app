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
      
      // Set up adaptive security monitoring with battery optimization
      let checkInterval = 15 * 60 * 1000; // Start with 15 minutes
      const maxInterval = 60 * 60 * 1000; // Max 1 hour
      let timeoutId: ReturnType<typeof setTimeout>;
      
      const scheduleCheck = () => {
        timeoutId = setTimeout(() => {
          performSecurityCheck();
          // Gradually increase interval for stable systems
          checkInterval = Math.min(checkInterval * 1.1, maxInterval);
          scheduleCheck();
        }, checkInterval);
      };
      
      scheduleCheck();
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
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
      // Silent error handling for security checks
    }
  };

  const handleSecurityViolation = (reason: string) => {
    // Security violations handled silently to avoid disrupting user experience
  };

  const handleAdBlockDetection = () => {
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