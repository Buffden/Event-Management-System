// Logger utility for EMS Client
// Logs to console and localStorage

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
    private logBuffer: string[] = [];
    private maxBufferSize = 1000; // Maximum number of log entries to keep in memory

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

    private formatMessage(level: LogLevel, component: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] [${component}]`;

        if (data) {
            return `${prefix} ${message} ${JSON.stringify(data)}`;
        }
        return `${prefix} ${message}`;
    }

    private async writeToStorage(logEntry: string): Promise<void> {
        try {
            // Add to buffer
            this.logBuffer.push(logEntry);

            // Keep buffer size manageable
            if (this.logBuffer.length > this.maxBufferSize) {
                this.logBuffer.shift();
            }

            // Client-side (browser) - store in localStorage
            if (typeof window !== 'undefined') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const logKey = `ems-logs-${timestamp.split('T')[0]}`;

                // Get existing logs for today
                const existingLogs = localStorage.getItem(logKey) || '';
                const updatedLogs = existingLogs + logEntry + '\n';

                // Store in localStorage (limited to ~5-10MB per domain)
                localStorage.setItem(logKey, updatedLogs);
            }
        } catch (error) {
            console.error('Failed to write log to storage:', error);
        }
    }


    private async log(level: LogLevel, component: string, message: string, data?: any): Promise<void> {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, component, message, data);

        // Log to console
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

        // Write to storage (localStorage for client-side)
        await this.writeToStorage(formattedMessage);
    }

    public debug(component: string, message: string, data?: any): void {
        this.log('debug', component, message, data).catch(console.error);
    }

    public info(component: string, message: string, data?: any): void {
        this.log('info', component, message, data).catch(console.error);
    }

    public warn(component: string, message: string, data?: any): void {
        this.log('warn', component, message, data).catch(console.error);
    }

    public error(component: string, message: string, data?: any): void {
        this.log('error', component, message, data).catch(console.error);
    }

    // Convenience methods for common use cases
    public apiCall(component: string, method: string, url: string, data?: any): void {
        this.debug(component, `API Call: ${method} ${url}`, data);
    }

    public apiResponse(component: string, method: string, url: string, status: number, data?: any): void {
        const level = status >= 400 ? 'error' : 'debug';
        this.log(level, component, `API Response: ${method} ${url} - ${status}`, data);
    }

    public authEvent(component: string, event: string, data?: any): void {
        this.debug(component, `Auth Event: ${event}`, data);
    }

    public userAction(component: string, action: string, data?: any): void {
        this.debug(component, `User Action: ${action}`, data);
    }

    public errorWithContext(component: string, context: string, error: Error | string, data?: any): void {
        const errorMessage = error instanceof Error ? error.message : error;
        this.error(component, `${context}: ${errorMessage}`, {
            ...data,
            stack: error instanceof Error ? error.stack : undefined
        });
    }

    // Method to get current log buffer (for debugging)
    public getLogBuffer(): string[] {
        return [...this.logBuffer];
    }

    // Method to clear logs
    public clearLogs(): void {
        this.logBuffer = [];
        if (typeof window !== 'undefined') {
            // Clear localStorage logs
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('ems-logs-')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }
}

// Create and export a singleton instance
export const logger = new Logger();

// Export the class for testing or custom instances
export {Logger};
