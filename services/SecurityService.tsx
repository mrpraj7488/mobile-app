import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityCheckResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldBlock: boolean;
}

interface TamperDetectionResult {
  isCompromised: boolean;
  detectedThreats: string[];
  riskScore: number;
}

interface VersionProtectionResult {
  isValidVersion: boolean;
  isDowngrade: boolean;
  currentVersion: string;
  expectedVersion: string;
}

class SecurityService {
  private static instance: SecurityService;
  private securityChecks: { [key: string]: boolean } = {};
  private appHash: string | null = null;
  private deviceFingerprint: string | null = null;
  private lastKnownVersion: string | null = null;
  private integrityChecksum: string | null = null;
  private antiTamperKeys: string[] = [];
  private securityViolations: number = 0;
  private maxViolations: number = 3;
  private isSecurityCompromised: boolean = false;
  
  // Critical app constants for integrity verification
  private readonly EXPECTED_BUNDLE_ID = 'com.vidgro.app';
  private readonly MINIMUM_VERSION = '1.0.0';
  private readonly SECURITY_SALT = 'VidGro2024Security';

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async performSecurityChecks(config: any): Promise<SecurityCheckResult> {
    const result: SecurityCheckResult = {
      isValid: true,
      warnings: [],
      errors: [],
      threatLevel: 'low',
      shouldBlock: false
    };

    // Skip security checks in development mode
    const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true' || process.env.EXPO_PUBLIC_SECURITY_MODE === 'development';
    
    if (isDevelopment) {
      // Development mode: Security checks bypassed
      return result;
    }

    // Initialize security monitoring
    await this.initializeSecurityMonitoring();

    // Perform comprehensive security checks
    const tamperResult = await this.detectTampering();
    const versionResult = await this.validateVersionIntegrity();
    const coinValidation = await this.validateCoinIntegrity();
    const adBlockResult = await this.detectAdBlocking();
    const rootResult = await this.detectRootJailbreak();
    const debugResult = await this.detectDebugging();
    const hooking = await this.detectHooking();

    // Evaluate threat level
    let riskScore = 0;
    
    if (tamperResult.isCompromised) {
      // Check if we should block tampering based on config
      const tamperResponse = config?.responses?.onTamperDetected || 'warn';
      if (tamperResponse === 'block') {
        result.errors.push('App tampering detected');
        riskScore += 30;
      } else {
        result.warnings.push('App tampering detected (development mode)');
        riskScore += 5; // Minimal risk in development
      }
    }
    
    if (versionResult.isDowngrade) {
      result.errors.push('Version downgrade attempt detected');
      riskScore += 25;
    }
    
    if (!coinValidation.isValid) {
      result.errors.push('Coin balance manipulation detected');
      riskScore += 35;
    }
    
    if (adBlockResult.isBlocked) {
      result.warnings.push('Ad blocking detected');
      riskScore += 15;
    }
    
    if (rootResult.isCompromised) {
      result.warnings.push('Device is rooted/jailbroken');
      riskScore += 20;
    }
    
    if (debugResult.isActive) {
      // Check if we should block debugging based on config
      const debugResponse = config?.responses?.onDebugDetected || 'warn';
      if (debugResponse === 'block') {
        result.errors.push('Debugging tools detected');
        riskScore += 40;
      } else {
        result.warnings.push('Debugging tools detected (development mode)');
        riskScore += 5; // Minimal risk in development
      }
    }
    
    if (hooking.isDetected) {
      result.errors.push('Code injection/hooking detected');
      riskScore += 45;
    }

    // Determine threat level and blocking decision
    if (riskScore >= 70) {
      result.threatLevel = 'critical';
      result.shouldBlock = true;
      result.isValid = false;
    } else if (riskScore >= 50) {
      result.threatLevel = 'high';
      result.shouldBlock = true;
      result.isValid = false;
    } else if (riskScore >= 30) {
      result.threatLevel = 'medium';
      result.shouldBlock = false;
    } else if (riskScore >= 10) {
      result.threatLevel = 'low';
    }

    // Track violations
    if (result.shouldBlock) {
      this.securityViolations++;
      if (this.securityViolations >= this.maxViolations) {
        this.isSecurityCompromised = true;
        await this.triggerSecurityLockdown();
      }
    }

    try {
      // Store security report
      await this.storeSecurityReport(result);
      
    } catch (error) {
      result.warnings.push('Security check execution failed');
      result.threatLevel = 'medium';
    }

    return result;
  }

  // ============ ADVANCED SECURITY METHODS ============

  private async initializeSecurityMonitoring(): Promise<void> {
    try {
      // Initialize anti-tamper keys
      this.antiTamperKeys = [
        'app_integrity_check',
        'version_validation',
        'coin_balance_hash',
        'user_session_token'
      ];

      // Load last known version
      this.lastKnownVersion = await SecureStore.getItemAsync('last_app_version');
      
      // Initialize integrity checksum
      await this.generateIntegrityChecksum();
      
      // Set up periodic security monitoring
      this.startSecurityMonitoring();
      
    } catch (error) {
      // Security monitoring initialization failed
    }
  }

  private async detectTampering(): Promise<TamperDetectionResult> {
    const threats: string[] = [];
    let riskScore = 0;

    try {
      // Check app bundle integrity
      const currentAppInfo = await this.getAppInfo();
      const expectedBundleId = this.EXPECTED_BUNDLE_ID;
      
      if (currentAppInfo.applicationId !== expectedBundleId) {
        threats.push('Bundle ID mismatch');
        riskScore += 40;
      }

      // Check for code modification
      const currentHash = await this.generateAppHash();
      const storedHash = await SecureStore.getItemAsync('app_integrity_hash');
      
      if (storedHash && currentHash !== storedHash) {
        threats.push('Code modification detected');
        riskScore += 35;
      } else if (!storedHash) {
        // Store hash for future checks
        await SecureStore.setItemAsync('app_integrity_hash', currentHash);
      }

      // Check for suspicious modifications to critical files
      const criticalChecks = await this.validateCriticalComponents();
      if (!criticalChecks.isValid) {
        threats.push('Critical component tampering');
        riskScore += 30;
      }

      // Check for memory manipulation
      const memoryCheck = await this.detectMemoryManipulation();
      if (memoryCheck.isDetected) {
        threats.push('Memory manipulation detected');
        riskScore += 25;
      }

    } catch (error) {
      threats.push('Tampering detection failed');
      riskScore += 10;
    }

    return {
      isCompromised: threats.length > 0,
      detectedThreats: threats,
      riskScore
    };
  }

  private async validateVersionIntegrity(): Promise<VersionProtectionResult> {
    try {
      const currentVersion = Application.nativeApplicationVersion || '0.0.0';
      const storedVersion = this.lastKnownVersion || currentVersion;

      // Check for version downgrade
      const isDowngrade = this.compareVersions(currentVersion, storedVersion) < 0;
      
      // Check minimum version requirement
      const meetsMinimum = this.compareVersions(currentVersion, this.MINIMUM_VERSION) >= 0;

      if (!isDowngrade && meetsMinimum) {
        // Update stored version
        await SecureStore.setItemAsync('last_app_version', currentVersion);
        this.lastKnownVersion = currentVersion;
      }

      return {
        isValidVersion: meetsMinimum && !isDowngrade,
        isDowngrade,
        currentVersion,
        expectedVersion: storedVersion
      };
    } catch (error) {
      return {
        isValidVersion: false,
        isDowngrade: true,
        currentVersion: 'unknown',
        expectedVersion: this.MINIMUM_VERSION
      };
    }
  }

  private async validateCoinIntegrity(): Promise<{ isValid: boolean; suspiciousActivity: string[] }> {
    const suspiciousActivity: string[] = [];
    
    try {
      // Check for unrealistic coin values
      const coinData = await AsyncStorage.getItem('user_coins');
      if (coinData) {
        const coins = parseInt(coinData);
        
        // Flag unrealistic coin amounts (over 1 million)
        if (coins > 1000000) {
          suspiciousActivity.push('Unrealistic coin balance detected');
        }
        
        // Check coin increment patterns
        const coinHistory = await AsyncStorage.getItem('coin_history');
        if (coinHistory) {
          const history = JSON.parse(coinHistory);
          const rapidIncrements = this.detectRapidCoinIncrements(history);
          if (rapidIncrements) {
            suspiciousActivity.push('Rapid coin increment pattern detected');
          }
        }
      }

      // Validate coin transaction integrity
      const transactionIntegrity = await this.validateCoinTransactions();
      if (!transactionIntegrity.isValid) {
        suspiciousActivity.push('Coin transaction tampering detected');
      }

    } catch (error) {
      suspiciousActivity.push('Coin validation failed');
    }

    return {
      isValid: suspiciousActivity.length === 0,
      suspiciousActivity
    };
  }

  private async detectAdBlocking(): Promise<{ isBlocked: boolean; method: string[] }> {
    const methods: string[] = [];
    
    try {
      // Check for ad blocker indicators
      // This would typically involve checking if ad networks are accessible
      
      // Method 1: Check for blocked ad domains
      const adDomains = ['googlesyndication.com', 'doubleclick.net'];
      for (const domain of adDomains) {
        try {
          // In a real implementation, you'd test network connectivity to these domains
          // For now, we'll simulate the check
          const isBlocked = await this.testDomainAccess(domain);
          if (isBlocked) {
            methods.push(`${domain} blocked`);
          }
        } catch (error) {
          methods.push(`${domain} inaccessible`);
        }
      }

      // Method 2: Check for ad blocker browser extensions (web only)
      if (Platform.OS === 'web') {
        const hasAdBlocker = await this.detectWebAdBlocker();
        if (hasAdBlocker) {
          methods.push('Browser ad blocker detected');
        }
      }

    } catch (error) {
      methods.push('Ad block detection failed');
    }

    return {
      isBlocked: methods.length > 0,
      method: methods
    };
  }

  private async detectRootJailbreak(): Promise<{ isCompromised: boolean; indicators: string[] }> {
    const indicators: string[] = [];
    
    try {
      if (Platform.OS === 'android') {
        // Enhanced Android root detection
        const rootChecks = await this.performAndroidRootChecks();
        indicators.push(...rootChecks);
      } else if (Platform.OS === 'ios') {
        // Enhanced iOS jailbreak detection
        const jailbreakChecks = await this.performIOSJailbreakChecks();
        indicators.push(...jailbreakChecks);
      }
    } catch (error) {
      indicators.push('Root/jailbreak detection failed');
    }

    return {
      isCompromised: indicators.length > 0,
      indicators
    };
  }

  private async detectDebugging(): Promise<{ isActive: boolean; tools: string[] }> {
    const tools: string[] = [];
    
    try {
      // Check for debugging indicators
      if (__DEV__) {
        tools.push('Development mode active');
      }

      // Check for remote debugging
      if (Platform.OS !== 'web') {
        const isRemoteDebugging = await this.checkRemoteDebugging();
        if (isRemoteDebugging) {
          tools.push('Remote debugging detected');
        }
      }

      // Check for debugging tools
      const debugTools = await this.scanForDebugTools();
      tools.push(...debugTools);

    } catch (error) {
      tools.push('Debug detection failed');
    }

    return {
      isActive: tools.length > 0,
      tools
    };
  }

  private async detectHooking(): Promise<{ isDetected: boolean; methods: string[] }> {
    const methods: string[] = [];
    
    try {
      // Check for function hooking
      const functionHooks = await this.detectFunctionHooking();
      if (functionHooks.length > 0) {
        methods.push(...functionHooks);
      }

      // Check for runtime manipulation
      const runtimeManipulation = await this.detectRuntimeManipulation();
      if (runtimeManipulation.length > 0) {
        methods.push(...runtimeManipulation);
      }

      // Check for code injection
      const codeInjection = await this.detectCodeInjection();
      if (codeInjection) {
        methods.push('Code injection detected');
      }

    } catch (error) {
      methods.push('Hook detection failed');
    }

    return {
      isDetected: methods.length > 0,
      methods
    };
  }

  private async triggerSecurityLockdown(): Promise<void> {
    try {
      // Clear sensitive data
      await this.clearSensitiveData();
      
      // Log security incident
      await this.logSecurityIncident();
      
      // Disable critical app functions
      await this.disableCriticalFunctions();
      
      // Notify backend of security breach
      await this.notifySecurityBreach();
      
    } catch (error) {
      console.error('Security lockdown failed:', error);
    }
  }

  private async storeSecurityReport(result: SecurityCheckResult): Promise<void> {
    try {
      const report = {
        timestamp: Date.now(),
        threatLevel: result.threatLevel,
        violations: this.securityViolations,
        deviceFingerprint: this.deviceFingerprint,
        appHash: this.appHash,
        warnings: result.warnings,
        errors: result.errors
      };

      await SecureStore.setItemAsync('security_report', JSON.stringify(report));
    } catch (error) {
      // Failed to store security report
    }
  }

  // ============ HELPER METHODS ============

  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    return 0;
  }

  private async generateIntegrityChecksum(): Promise<void> {
    try {
      const appInfo = await this.getAppInfo();
      const deviceInfo = await this.getDeviceInfo();
      
      const checksumData = {
        ...appInfo,
        ...deviceInfo,
        salt: this.SECURITY_SALT,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hourly rotation
      };

      this.integrityChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(checksumData)
      );
    } catch (error) {
      this.integrityChecksum = null;
    }
  }

  private startSecurityMonitoring(): void {
    // Set up intelligent security monitoring with adaptive intervals
    let checkInterval = 10 * 60 * 1000; // Start with 10 minutes
    const maxInterval = 30 * 60 * 1000; // Max 30 minutes
    let consecutiveSuccesses = 0;
    
    const scheduleSecurityCheck = () => {
      setTimeout(async () => {
        try {
          await this.performPeriodicSecurityCheck();
          consecutiveSuccesses++;
          
          // Gradually increase interval for stable systems
          if (consecutiveSuccesses > 3) {
            checkInterval = Math.min(checkInterval * 1.2, maxInterval);
          }
        } catch (error) {
          // Periodic security check failed
          consecutiveSuccesses = 0;
          checkInterval = 10 * 60 * 1000; // Reset to 10 minutes on failure
        }
        
        scheduleSecurityCheck();
      }, checkInterval);
    };
    
    scheduleSecurityCheck();
  }

  private async performPeriodicSecurityCheck(): Promise<void> {
    // Lightweight security checks that run periodically
    const tampering = await this.detectTampering();
    if (tampering.isCompromised) {
      this.securityViolations++;
    }
  }

  private async validateCriticalComponents(): Promise<{ isValid: boolean }> {
    // Validate critical app components haven't been modified
    try {
      // This would check file hashes, component integrity, etc.
      return { isValid: true };
    } catch (error) {
      return { isValid: false };
    }
  }

  private async detectMemoryManipulation(): Promise<{ isDetected: boolean }> {
    // Detect memory manipulation attempts
    try {
      // This would involve checking for memory patches, hooks, etc.
      return { isDetected: false };
    } catch (error) {
      return { isDetected: true };
    }
  }

  private detectRapidCoinIncrements(history: any[]): boolean {
    // Analyze coin increment patterns for suspicious activity
    if (!Array.isArray(history) || history.length < 3) return false;
    
    const recentTransactions = history.slice(-10);
    let rapidIncrements = 0;
    
    for (let i = 1; i < recentTransactions.length; i++) {
      const timeDiff = recentTransactions[i].timestamp - recentTransactions[i-1].timestamp;
      const amountDiff = recentTransactions[i].amount - recentTransactions[i-1].amount;
      
      // Flag if large amounts added in short time
      if (timeDiff < 10000 && amountDiff > 1000) {
        rapidIncrements++;
      }
    }
    
    return rapidIncrements > 3;
  }

  private async validateCoinTransactions(): Promise<{ isValid: boolean }> {
    // Validate coin transaction integrity
    try {
      // This would check transaction hashes, validate against server, etc.
      return { isValid: true };
    } catch (error) {
      return { isValid: false };
    }
  }

  private async testDomainAccess(domain: string): Promise<boolean> {
    // Test if domain is accessible (blocked by ad blocker)
    try {
      // In a real implementation, you'd make a network request
      return false; // Simulate no blocking for now
    } catch (error) {
      return true; // Assume blocked if error
    }
  }

  private async detectWebAdBlocker(): Promise<boolean> {
    // Detect web-based ad blockers
    if (Platform.OS !== 'web') return false;
    
    try {
      // This would check for ad blocker indicators in web environment
      return false;
    } catch (error) {
      return false;
    }
  }

  private async performAndroidRootChecks(): Promise<string[]> {
    const indicators: string[] = [];
    
    try {
      // Check for root management apps
      const rootApps = [
        'com.topjohnwu.magisk',
        'com.koushikdutta.superuser',
        'eu.chainfire.supersu',
        'com.noshufou.android.su'
      ];
      
      // In a real implementation, you'd check if these apps are installed
      // For now, we'll simulate the check
      
      // Check for root files
      const rootFiles = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su'
      ];
      
      // Check build properties
      const deviceInfo = await this.getDeviceInfo();
      if (deviceInfo.manufacturer?.toLowerCase().includes('generic')) {
        indicators.push('Generic device detected');
      }
      
    } catch (error) {
      indicators.push('Root check failed');
    }
    
    return indicators;
  }

  private async performIOSJailbreakChecks(): Promise<string[]> {
    const indicators: string[] = [];
    
    try {
      // Check for jailbreak files and apps
      const jailbreakApps = [
        'cydia://',
        'sileo://',
        'zbra://',
        'activator://'
      ];
      
      // Check for jailbreak files
      const jailbreakFiles = [
        '/Applications/Cydia.app',
        '/Library/MobileSubstrate',
        '/usr/sbin/sshd',
        '/etc/apt'
      ];
      
      // Check device capabilities
      const deviceInfo = await this.getDeviceInfo();
      if (deviceInfo.deviceType === Device.DeviceType.UNKNOWN) {
        indicators.push('Unknown device type');
      }
      
    } catch (error) {
      indicators.push('Jailbreak check failed');
    }
    
    return indicators;
  }

  private async checkRemoteDebugging(): Promise<boolean> {
    try {
      // Check for remote debugging connections
      // This would involve checking network connections, debug ports, etc.
      return false;
    } catch (error) {
      return false;
    }
  }

  private async scanForDebugTools(): Promise<string[]> {
    const tools: string[] = [];
    
    try {
      // Check for debugging tools and frameworks
      const debugTools = [
        'Frida',
        'Xposed',
        'Substrate',
        'Cycript'
      ];
      
      // In a real implementation, you'd scan for these tools
      
    } catch (error) {
      tools.push('Debug tool scan failed');
    }
    
    return tools;
  }

  private async detectFunctionHooking(): Promise<string[]> {
    const hooks: string[] = [];
    
    try {
      // Check for function hooks and patches
      // This would involve checking function pointers, call stacks, etc.
      
    } catch (error) {
      hooks.push('Function hook detection failed');
    }
    
    return hooks;
  }

  private async detectRuntimeManipulation(): Promise<string[]> {
    const manipulations: string[] = [];
    
    try {
      // Check for runtime manipulation
      // This would involve checking object prototypes, global variables, etc.
      
    } catch (error) {
      manipulations.push('Runtime manipulation detection failed');
    }
    
    return manipulations;
  }

  private async detectCodeInjection(): Promise<boolean> {
    try {
      // Check for code injection
      // This would involve checking for injected code, modified functions, etc.
      return false;
    } catch (error) {
      return false;
    }
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear sensitive data from storage
      await AsyncStorage.multiRemove(['user_coins', 'auth_token', 'user_data']);
      await SecureStore.deleteItemAsync('app_integrity_hash');
    } catch (error) {
      console.error('Failed to clear sensitive data');
    }
  }

  private async logSecurityIncident(): Promise<void> {
    try {
      const incident = {
        timestamp: Date.now(),
        violations: this.securityViolations,
        deviceFingerprint: this.deviceFingerprint,
        threatLevel: 'critical'
      };
      
      await SecureStore.setItemAsync('security_incident', JSON.stringify(incident));
    } catch (error) {
      console.error('Failed to log security incident');
    }
  }

  private async disableCriticalFunctions(): Promise<void> {
    try {
      // Disable critical app functions
      this.isSecurityCompromised = true;
      await AsyncStorage.setItem('app_disabled', 'true');
    } catch (error) {
      console.error('Failed to disable critical functions');
    }
  }

  private async notifySecurityBreach(): Promise<void> {
    try {
      // Notify backend of security breach
      // This would involve making an API call to report the incident
    } catch (error) {
      console.error('Failed to notify security breach');
    }
  }

  // ============ PUBLIC SECURITY METHODS ============

  async isAppSecure(): Promise<boolean> {
    return !this.isSecurityCompromised;
  }

  async getSecurityViolationCount(): Promise<number> {
    return this.securityViolations;
  }

  async resetSecurityViolations(): Promise<void> {
    this.securityViolations = 0;
    this.isSecurityCompromised = false;
    await AsyncStorage.removeItem('app_disabled');
  }

  private async checkRootStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      // Enhanced root detection using multiple methods
      const rootIndicators = await this.checkMultipleRootIndicators();
      return { isValid: !rootIndicators.isRooted };
    } catch (error) {
      return { isValid: true }; // Assume valid if check fails
    }
  }

  private async checkMultipleRootIndicators(): Promise<{ isRooted: boolean; indicators: string[] }> {
    const indicators: string[] = [];
    
    try {
      // Method 1: Check for common root apps and files
      if (Platform.OS === 'android') {
        // This would require native module implementation
        // For now, use basic detection
        const suspiciousApps = ['com.topjohnwu.magisk', 'com.koushikdutta.superuser'];
        // In real implementation, you'd check if these apps are installed
      }
      
      // Method 2: Check system properties
      if (Platform.OS === 'ios') {
        // Check for jailbreak indicators
        // This would require native implementation
      }
      
      return { isRooted: indicators.length > 0, indicators };
    } catch (error) {
      return { isRooted: false, indicators: [] };
    }
  }

  private async checkEmulatorStatus(): Promise<{ isValid: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { isValid: true };
      }

      // Enhanced emulator detection
      if (Platform.OS === 'android') {
        const deviceInfo = await this.getDeviceInfo();
        const isEmulator = this.detectAndroidEmulator(deviceInfo);
        return { isValid: !isEmulator };
      }

      if (Platform.OS === 'ios') {
        const isSimulator = await this.detectIOSSimulator();
        return { isValid: !isSimulator };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: true };
    }
  }

  private async getDeviceInfo() {
    try {
      return {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        deviceName: Device.deviceName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
        deviceType: Device.deviceType,
      };
    } catch (error) {
      return {};
    }
  }

  private detectAndroidEmulator(deviceInfo: any): boolean {
    const emulatorIndicators = [
      'google_sdk', 'emulator', 'android sdk', 'genymotion',
      'vbox', 'simulator', 'virtual', 'goldfish', 'ranchu'
    ];

    const brand = deviceInfo.brand?.toLowerCase() || '';
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const modelName = deviceInfo.modelName?.toLowerCase() || '';
    const deviceName = deviceInfo.deviceName?.toLowerCase() || '';

    return emulatorIndicators.some(indicator =>
      brand.includes(indicator) ||
      manufacturer.includes(indicator) ||
      modelName.includes(indicator) ||
      deviceName.includes(indicator)
    );
  }

  private async detectIOSSimulator(): Promise<boolean> {
    try {
      // iOS simulator detection
      if (Platform.OS === 'ios') {
        const deviceType = Device.deviceType;
        // Device.DeviceType.UNKNOWN typically indicates simulator
        return deviceType === Device.DeviceType.UNKNOWN;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async validateAppSignature(): Promise<{ isValid: boolean }> {
    try {
      // Enhanced app signature validation
      const appInfo = await this.getAppInfo();
      const currentHash = await this.generateAppHash();
      
      // Store the hash for comparison
      this.appHash = currentHash;
      
      // In production, you'd compare against known good signatures
      // For now, just validate that we can generate a hash
      return { isValid: currentHash.length > 0 };
    } catch (error) {
      return { isValid: true };
    }
  }

  private async getAppInfo() {
    try {
      return {
        applicationId: Application.applicationId,
        applicationName: Application.applicationName,
        nativeApplicationVersion: Application.nativeApplicationVersion,
        nativeBuildVersion: Application.nativeBuildVersion,
        platform: Platform.OS,
        version: Platform.Version,
      };
    } catch (error) {
      return {};
    }
  }

  async generateDeviceFingerprint(): Promise<string> {
    try {
      if (this.deviceFingerprint) {
        return this.deviceFingerprint;
      }

      const deviceInfo = await this.getDeviceInfo();
      const appInfo = await this.getAppInfo();
      
      const fingerprintData = {
        ...deviceInfo,
        ...appInfo,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)), // Daily rotation
      };

      const fingerprintString = JSON.stringify(fingerprintData);
      this.deviceFingerprint = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );

      return this.deviceFingerprint;
    } catch (error) {
      try {
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Platform.OS}-${Device.modelName || 'unknown'}-${this.SECURITY_SALT}`
        );
      } catch {
        return '';
      }
    }
  }

  private async checkDebugMode(): Promise<{ isValid: boolean }> {
    try {
      // Check if app is in debug mode
      const isDebug = __DEV__;
      return { isValid: !isDebug };
    } catch (error) {
      return { isValid: true };
    }
  }

  async generateAppHash(): Promise<string> {
    try {
      if (this.appHash) {
        return this.appHash;
      }

      // Enhanced app hash generation
      const appInfo = await this.getAppInfo();
      const deviceInfo = await this.getDeviceInfo();
      
      const hashData = {
        ...appInfo,
        platform: Platform.OS,
        version: Platform.Version,
        // Add more app-specific data for integrity checking
        buildTime: __DEV__ ? 'development' : 'production',
      };

      const hashString = JSON.stringify(hashData);
      this.appHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashString
      );

      return this.appHash;
    } catch (error) {
      return '';
    }
  }

  isSecurityCheckPassed(checkName: string): boolean {
    return this.securityChecks[checkName] || false;
  }

  setSecurityCheckResult(checkName: string, passed: boolean) {
    this.securityChecks[checkName] = passed;
  }

  async validateConfigIntegrity(config: any, expectedHash?: string): Promise<boolean> {
    try {
      if (!expectedHash) {
        return true; // Skip validation if no hash provided
      }

      const configString = JSON.stringify(config);
      const actualHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        configString
      );

      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  getSecurityReport(): {
    deviceFingerprint: string | null;
    appHash: string | null;
    checksPerformed: { [key: string]: boolean };
    platform: string;
  } {
    return {
      deviceFingerprint: this.deviceFingerprint,
      appHash: this.appHash,
      checksPerformed: { ...this.securityChecks },
      platform: Platform.OS,
    };
  }
}

export default SecurityService;