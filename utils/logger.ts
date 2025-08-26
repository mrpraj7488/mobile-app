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
    if (this.enabled) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    if (this.enabled) {
      console.error(...args);
    }
  }

  info(...args: any[]): void {
    if (this.enabled) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.enabled) {
      console.debug(...args);
    }
  }

  table(data: any): void {
    if (this.enabled && console.table) {
      console.table(data);
    }
  }

  time(label: string): void {
    if (this.enabled && console.time) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.enabled && console.timeEnd) {
      console.timeEnd(label);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

const logger = Logger.getInstance();

export default logger;
