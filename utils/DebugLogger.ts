import { Platform } from 'react-native';

class DebugLogger {
  private static instance: DebugLogger;
  private isDebugMode: boolean = false; // Disabled for production
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
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    this.logs.push(formattedMessage);
    
    // Silent in production
  }

  error(tag: string, message: string, error?: any) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ERROR: ${message}`;
    this.logs.push(formattedMessage);
    
    // Silent in production
  }

  warn(tag: string, message: string, data?: any) {
    if (!this.isDebugMode) return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] WARN: ${message}`;
    this.logs.push(formattedMessage);
    
    // Silent in production
  }

  info(tag: string, message: string, data?: any) {
    if (!this.isDebugMode) return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] INFO: ${message}`;
    this.logs.push(formattedMessage);
    
    // Silent in production
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
