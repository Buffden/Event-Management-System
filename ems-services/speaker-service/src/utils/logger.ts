// src/utils/logger.ts

interface LogMeta {
    [key: string]: any;
}

class Logger {
    private serviceName = 'speaker-service';

    private formatMessage(level: string, message: string, filename: string, meta?: LogMeta): string {
        const timestamp = new Date().toISOString();

        return `[${timestamp}] - [${this.serviceName}] - [${filename}] - ${level.toUpperCase()} - ${message}${meta ? ` | ${JSON.stringify(meta)}` : ''}`;
    }

    private getFilename(): string {
        const stack = new Error().stack;
        if (!stack) return 'unknown';

        const lines = stack.split('\n');
        // Skip the first few lines (Error, getFilename, and the logger method calls)
        // Look for the first line that's not from this logger file or node_modules
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i];
            if (line && !line.includes('logger.ts') && !line.includes('node_modules')) {
                // Try to extract filename from different stack trace formats
                let match = line.match(/\(([^)]+)\)/);
                if (!match) {
                    match = line.match(/at\s+.*?\s+\(([^)]+)\)/);
                }
                if (!match) {
                    match = line.match(/at\s+([^\s]+)/);
                }

                if (match && match[1]) {
                    const fullPath = match[1];
                    // Handle both absolute and relative paths
                    const parts = fullPath.split('/');
                    const filename = parts[parts.length - 1];
                    // Remove line number if present (e.g., "file.ts:123:45")
                    return filename ? filename.split(':')[0] || 'unknown' : 'unknown';
                }
            }
        }
        return 'unknown';
    }

    debug(message: string, meta?: LogMeta): void {
        const filename = this.getFilename();
        const formattedMessage = this.formatMessage('debug', message, filename, meta);
        console.log(formattedMessage);
    }

    info(message: string, meta?: LogMeta): void {
        const filename = this.getFilename();
        const formattedMessage = this.formatMessage('info', message, filename, meta);
        console.log(formattedMessage);
    }

    warn(message: string, meta?: LogMeta): void {
        const filename = this.getFilename();
        const formattedMessage = this.formatMessage('warn', message, filename, meta);
        console.warn(formattedMessage);
    }

    error(message: string, error?: Error, meta?: LogMeta): void {
        const filename = this.getFilename();
        const errorMeta = {
            ...meta,
            ...(error && {
                errorMessage: error.message,
                errorStack: error.stack
            })
        };
        const formattedMessage = this.formatMessage('error', message, filename, errorMeta);
        console.error(formattedMessage);
    }
}

export const logger = new Logger();
