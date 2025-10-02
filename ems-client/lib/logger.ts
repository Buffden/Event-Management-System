// Logger utility for EMS Client
// Only logs in development mode

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  service: string;
}

class Logger {
  private serviceName = 'ems-client';
  private isDevelopment: boolean;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development' ||
                        process.env.NEXT_PUBLIC_ENV === 'development' ||
                        (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      return false;
    }

    // In development, log all levels
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}]`;

    if (data) {
      return `${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  // Convenience methods for common use cases
  public apiCall(method: string, url: string, data?: any): void {
    this.debug(`API Call: ${method} ${url}`, data);
  }

  public apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? 'error' : 'debug';
    this.log(level, `API Response: ${method} ${url} - ${status}`, data);
  }

  public authEvent(event: string, data?: any): void {
    this.debug(`Auth Event: ${event}`, data);
  }

  public userAction(action: string, data?: any): void {
    this.debug(`User Action: ${action}`, data);
  }

  public errorWithContext(context: string, error: Error | string, data?: any): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.error(`${context}: ${errorMessage}`, {
      ...data,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Create and export a singleton instance
export const logger = new Logger();

// Export the class for testing or custom instances
export { Logger };
