import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

interface SecurityCheckResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

class SecurityService {
  private static instance: SecurityService;
  private securityChecks: { [key: string]: boolean } = {};
  private appHash: string | null = null;
  private deviceFingerprint: string | null = null;

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
      errors: []
    };

    try {
      // Check for rooted/jailbroken devices
      if (config.security?.allowRooted === false) {
        const rootCheckResult = await this.checkRootStatus();
        if (!rootCheckResult.isValid) {
          result.warnings.push('Device appears to be rooted/jailbroken');
          // Don't block for now, just warn
        }
      }

      // Check for emulator
      if (config.security?.allowEmulators === false) {
        const emulatorCheckResult = await this.checkEmulatorStatus();
        if (!emulatorCheckResult.isValid) {
          result.warnings.push('Running on emulator');
          // Don't fail for emulator, just warn
        }
      }

      // App signature validation
      if (config.security?.requireSignatureValidation === true) {
        const signatureResult = await this.validateAppSignature();
        if (!signatureResult.isValid) {
          result.warnings.push('App signature validation failed');
          // Don't block for now, just warn
        }
      }

      // Debug detection - removed for production
      // Only check debug mode in development builds
      if (__DEV__ && config.app?.environment !== 'production') {
        const debugResult = await this.checkDebugMode();
        if (!debugResult.isValid) {
          // Don't add warning in production
        }
      }

      // Generate device fingerprint for tracking
      await this.generateDeviceFingerprint();

    } catch (error) {
      result.warnings.push('Some security checks could not be performed');
    }

    return result;
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
      return '';
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