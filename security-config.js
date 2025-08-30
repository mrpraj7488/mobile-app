// Enhanced Security configuration for VidGro mobile app
const SecurityConfig = {
  // App integrity protection
  integrity: {
    expectedBundleId: 'com.zozo1.vidgrowatch',
    minimumVersion: '1.0.0',
    allowDebugBuilds: process.env.EXPO_PUBLIC_DEVELOPMENT_MODE === 'true',
    enableTamperDetection: process.env.EXPO_PUBLIC_ENABLE_TAMPER_DETECTION === 'true',
    enableVersionProtection: true,
    maxSecurityViolations: parseInt(process.env.EXPO_PUBLIC_MAX_SECURITY_VIOLATIONS) || 3
  },

  // Anti-tampering measures
  antiTamper: {
    enableRootDetection: process.env.EXPO_PUBLIC_ENABLE_ROOT_DETECTION === 'true',
    enableEmulatorDetection: process.env.EXPO_PUBLIC_ENABLE_EMULATOR_DETECTION === 'true',
    enableHookDetection: true,
    enableMemoryProtection: true,
    enableCodeObfuscation: process.env.EXPO_PUBLIC_APP_ENV === 'production',
    blockRootedDevices: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production',
    blockEmulators: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production'
  },

  // Coin protection system
  coinProtection: {
    maxRealisticBalance: 1000000,
    maxDailyEarnings: 10000,
    suspiciousIncrementThreshold: 1000,
    rapidIncrementTimeWindow: 10000, // 10 seconds
    maxRapidIncrements: 3,
    enableTransactionValidation: true
  },

  // Ad blocking detection
  adBlockDetection: {
    enableDetection: true,
    testDomains: ['googlesyndication.com', 'doubleclick.net', 'googletagmanager.com'],
    warningThreshold: 2, // Show warning after 2 detections
    blockThreshold: 5 // Block after 5 detections
  },

  // Network security
  allowedDomains: [
    'kuibswqfmhhdybttbcoa.supabase.co',
    'admin-vidgro.netlify.app',
    'youtube.com',
    'youtu.be',
    'img.youtube.com',
    'www.youtube.com',
    'googlesyndication.com',
    'doubleclick.net',
    'googletagmanager.com',
    'google.com'
  ],

  // Content Security Policy
  csp: {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' https://www.youtube.com",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https://img.youtube.com",
    'media-src': "'self' https://www.youtube.com",
    'connect-src': "'self' https://*.supabase.co wss://*.supabase.co",
    'frame-src': "https://www.youtube.com"
  },

  // API rate limiting
  rateLimits: {
    videoFetch: { requests: 100, window: 3600000 }, // 100 requests per hour
    userActions: { requests: 1000, window: 3600000 }, // 1000 requests per hour
    authentication: { requests: 10, window: 900000 } // 10 requests per 15 minutes
  },

  // Input validation patterns
  validation: {
    youtubeUrl: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}(&.*)?$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    username: /^[a-zA-Z0-9_]{3,20}$/,
    videoId: /^[a-zA-Z0-9_-]{11}$/
  },

  // Security monitoring
  monitoring: {
    periodicCheckInterval: 300000, // 5 minutes
    tamperCheckInterval: 30000, // 30 seconds
    enableRealTimeMonitoring: true,
    enableSecurityReporting: true,
    maxLogRetention: 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // Debug and development protection
  debugProtection: {
    blockRemoteDebugging: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production',
    blockDevTools: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production',
    detectDebuggingTools: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production',
    obfuscateConsoleOutput: process.env.EXPO_PUBLIC_ENABLE_LOGGING !== 'true',
    disableInspection: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production'
  },

  // Runtime protection
  runtimeProtection: {
    enableFunctionProtection: true,
    enableVariableProtection: true,
    enableCallStackProtection: true,
    detectCodeInjection: true,
    preventDynamicEvaluation: true
  },

  // Sensitive data patterns to exclude from logs
  sensitivePatterns: [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /session/i,
    /coin/i,
    /balance/i,
    /transaction/i,
    /payment/i
  ],

  // Security response actions
  responses: {
    onTamperDetected: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production' ? 'block' : 'warn',
    onRootDetected: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production' ? 'block' : 'warn',
    onDebugDetected: process.env.EXPO_PUBLIC_SECURITY_MODE === 'production' ? 'block' : 'warn',
    onVersionDowngrade: 'block',
    onCoinManipulation: 'block',
    onAdBlockDetected: 'warn',
    onCriticalViolation: 'disable'
  }
};

export default SecurityConfig;
