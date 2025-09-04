import { Platform } from 'react-native';

class DebugLogger {
  private static instance: DebugLogger;
  private isDebugMode: boolean = true; // Enable debug mode
  private logs: string[] = [];

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private formatMessage(level: string, tag: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? `\nDATA: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level}] [${tag}] ${message}${dataStr}`;
  }

  log(tag: string, message: string, data?: any) {
    if (!this.isDebugMode) return;
    
    const formattedMessage = this.formatMessage('LOG', tag, message, data);
    this.logs.push(formattedMessage);
    
    // Console output for development
    console.log(`🔵 ${formattedMessage}`);
    
    // Android native logging
    if (Platform.OS === 'android') {
      console.log(`[GOOGLE_AUTH_DEBUG] ${formattedMessage}`);
    }
  }

  error(tag: string, message: string, error?: any) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    
    const formattedMessage = this.formatMessage('ERROR', tag, message, errorData);
    this.logs.push(formattedMessage);
    
    // Console output for development
    console.error(`🔴 ${formattedMessage}`);
    
    // Android native logging
    if (Platform.OS === 'android') {
      console.error(`[GOOGLE_AUTH_ERROR] ${formattedMessage}`);
    }
  }

  warn(tag: string, message: string, data?: any) {
    if (!this.isDebugMode) return;
    
    const formattedMessage = this.formatMessage('WARN', tag, message, data);
    this.logs.push(formattedMessage);
    
    // Console output for development
    console.warn(`🟡 ${formattedMessage}`);
    
    // Android native logging
    if (Platform.OS === 'android') {
      console.warn(`[GOOGLE_AUTH_WARN] ${formattedMessage}`);
    }
  }

  info(tag: string, message: string, data?: any) {
    if (!this.isDebugMode) return;
    
    const formattedMessage = this.formatMessage('INFO', tag, message, data);
    this.logs.push(formattedMessage);
    
    // Console output for development
    console.info(`🟢 ${formattedMessage}`);
    
    // Android native logging
    if (Platform.OS === 'android') {
      console.info(`[GOOGLE_AUTH_INFO] ${formattedMessage}`);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.join('\n\n');
  }

  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    this.log('DebugLogger', `Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}

export default DebugLogger;
