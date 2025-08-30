// Centralized logging utility for production/development environments
const isDev = __DEV__;

class Logger {
  private static instance: Logger;
  private enabled: boolean;

  constructor() {
    this.enabled = isDev;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(...args: any[]): void {
    // Logging disabled in production
  }

  warn(...args: any[]): void {
    // Logging disabled in production
  }

  error(...args: any[]): void {
    // Logging disabled in production
  }

  info(...args: any[]): void {
    // Logging disabled in production
  }

  debug(...args: any[]): void {
    // Logging disabled in production
  }

  table(data: any): void {
    // Logging disabled in production
  }

  time(label: string): void {
    // Logging disabled in production
  }

  timeEnd(label: string): void {
    // Logging disabled in production
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

const logger = Logger.getInstance();

export default logger;
