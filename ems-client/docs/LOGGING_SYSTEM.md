# EMS Client Logging System

The EMS Client includes a logging system that writes logs to both the console and files. When running in a Docker container, logs are stored at a configurable path (default: `/app/{timestamp}.log`). When running in a browser, logs are stored in localStorage.

## Features

- **Dual Output**: Logs are written to both console and files
- **Configurable Log Path**: Logs are stored at a configurable path (default: `/app/{timestamp}.log`) in containers
- **Browser Fallback**: Logs are stored in localStorage when running in browser
- **Automatic Cleanup**: Log buffer management to prevent memory issues
- **Timestamp-based Organization**: Logs are organized by precise timestamps
- **Development Mode**: Only logs in development environment

## Usage

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Logging with data
logger.info('User action', { userId: '123', action: 'login' });
logger.error('API Error', { status: 500, url: '/api/users' });
```

### Convenience Methods

```typescript
// API logging
logger.apiCall('POST', '/api/auth/login', { email: 'user@example.com' });
logger.apiResponse('POST', '/api/auth/login', 200, { token: '...' });

// Authentication events
logger.authEvent('User login successful', { userId: '123' });

// User actions
logger.userAction('Button clicked', { buttonId: 'submit-form' });

// Error with context
logger.errorWithContext('Authentication failed', error, { email: 'user@example.com' });
```

### Client-side Log Management

```typescript
import { logger } from '@/lib/logger';

// Get current log buffer
const logs = logger.getLogBuffer();

// Clear all logs
logger.clearLogs();
```


## Log Storage

### Docker Container (Primary)
- Logs are stored in a configurable directory (default: `/app/`) inside the container
- File naming: `{timestamp}.log` (e.g., `2024-01-15T10-30-45-123Z.log`)
- Automatic directory creation
- Direct file system access
- Each log entry creates a new file with precise timestamp
- Path configurable via `LOG_FILE_PATH` environment variable

### Browser (Fallback)
- Logs are stored in `localStorage` with keys like `ems-logs-YYYY-MM-DD`
- Maximum buffer size: 1000 entries in memory
- Automatic cleanup of old entries
- Date-based organization for easy retrieval
- Persistent across browser sessions

## Log Format

All logs follow this format:
```
[2024-01-15T10:30:45.123Z] [ems-client] [INFO] User login successful {"userId":"123","email":"user@example.com"}
```

Components:
- **Timestamp**: ISO 8601 format
- **Service**: Service name (ems-client or ems-client-server)
- **Level**: DEBUG, INFO, WARN, ERROR
- **Message**: Human-readable message
- **Data**: JSON object with additional context (optional)

## Docker Integration

### Accessing Logs in Docker Container

To view logs in your Docker container:

```bash
# Access the container
docker exec -it <container_name> /bin/bash

# List log files (default path is /app, or use your configured LOG_FILE_PATH)
ls -la /app/

# View a specific log file
cat /app/2024-01-15T10-30-45-123Z.log

# View all log files
cat /app/*.log

# Follow logs in real-time
tail -f /app/*.log

# If you've configured a different LOG_FILE_PATH, use that path instead
# Example: if LOG_FILE_PATH=/var/log/ems-client
ls -la /var/log/ems-client/
cat /var/log/ems-client/*.log
```

### Browser Integration (Fallback)

To view logs in your browser (when not in Docker):

```javascript
// Open browser console and run:
// View today's logs
const today = new Date().toISOString().split('T')[0];
const logs = localStorage.getItem(`ems-logs-${today}`);
console.log(logs);

// View all log keys
Object.keys(localStorage).filter(key => key.startsWith('ems-logs-'));

// Clear all logs
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('ems-logs-')) {
    localStorage.removeItem(key);
  }
});
```

## Configuration

### Environment Variables

The logger respects these environment variables:
- `NODE_ENV`: Set to 'development' to enable logging
- `NEXT_PUBLIC_ENV`: Alternative development flag
- `LOG_FILE_PATH`: Path where log files should be stored (default: `/app`)

### Example Environment Configuration

Create a `.env.production` file:
```bash
# Production environment variables for EMS Client

# API Configuration
NEXT_PUBLIC_API_BASE_URL=/api

# Logging Configuration
LOG_FILE_PATH=/app
```

Or for a different log directory:
```bash
LOG_FILE_PATH=/var/log/ems-client
```

### Development Mode

Logging is automatically enabled when:
- `NODE_ENV === 'development'`
- `NEXT_PUBLIC_ENV === 'development'`
- Running on localhost

## Best Practices

1. **Use Appropriate Log Levels**:
   - `debug`: Detailed information for debugging
   - `info`: General information about application flow
   - `warn`: Warning messages for potential issues
   - `error`: Error messages for failures

2. **Include Context**:
   ```typescript
   // Good
   logger.error('User authentication failed', {
     userId: user.id,
     email: user.email,
     error: error.message
   });

   // Avoid
   logger.error('Authentication failed');
   ```

3. **Use Convenience Methods**:
   ```typescript
   // Good
   logger.apiCall('POST', '/api/users', userData);
   logger.authEvent('User registered', { userId: user.id });

   // Avoid
   logger.info('API call: POST /api/users', userData);
   ```

4. **Handle Errors Gracefully**:
   ```typescript
   try {
     await apiCall();
   } catch (error) {
     logger.errorWithContext('API call failed', error, { endpoint: '/api/users' });
   }
   ```

## Troubleshooting

### Logs Not Appearing
1. Check if you're in development mode
2. Verify the logger is imported correctly
3. Check browser console for any logger errors

### Log Files Not Created in Docker
1. Check container filesystem permissions
2. Verify `/app` directory exists
3. Check disk space in container

### Logs Not Stored in localStorage (Browser)
1. Check browser localStorage permissions
2. Verify localStorage is not disabled
3. Check localStorage quota limits

## Security Considerations

- Logs may contain sensitive information (tokens, user data)
- Docker container logs are stored in the container filesystem
- Browser logs are stored in localStorage (accessible to user)
- Consider log sanitization for production environments
- Logs are automatically cleaned up to prevent storage bloat
- Be mindful of sensitive data in logs

## Performance Impact

- Client-side logging has minimal performance impact
- Log buffer prevents memory leaks
- Automatic cleanup maintains performance
- localStorage operations are asynchronous and non-blocking
