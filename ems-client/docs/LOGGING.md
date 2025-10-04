# EMS Client Logging System

## Overview

The EMS Client includes a comprehensive logging system that provides detailed debugging information during development while remaining silent in production.

## Environment-Based Logging

The logger automatically detects the environment and only logs in development mode:

- **Development**: All logs are displayed in the browser console
- **Production**: No logs are displayed (silent)

### Environment Detection

The logger checks multiple sources to determine if it's in development mode:

1. `process.env.NODE_ENV === 'development'`
2. `process.env.NEXT_PUBLIC_ENV === 'development'`
3. `window.location.hostname === 'localhost'` (client-side)

## Usage

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Different log levels
logger.debug('Debug information', { userId: '123' });
logger.info('General information', { action: 'login' });
logger.warn('Warning message', { error: 'validation failed' });
logger.error('Error occurred', { error: new Error('Something went wrong') });
```

### Convenience Methods

```typescript
// API call logging
logger.apiCall('POST', '/auth/login', { email: 'user@example.com' });
logger.apiResponse('POST', '/auth/login', 200, { token: '...' });

// Authentication events
logger.authEvent('User login successful', { userId: '123', role: 'USER' });

// User actions
logger.userAction('Form submitted', { formType: 'registration' });

// Error with context
logger.errorWithContext('API Request Failed', error, { endpoint: '/auth/login' });
```

## Log Format

All logs follow a consistent format:

```
[timestamp] [service-name] [LEVEL] message
```

Example:
```
[2024-01-15T10:30:45.123Z] [ems-client] [INFO] Auth Event: User login successful { userId: '123', email: 'user@example.com' }
```

## Integration Points

### 1. API Client (`lib/api/auth.api.ts`, `lib/api/event.api.ts`)

- Logs all API requests and responses
- Tracks authentication status
- Records token management operations
- Logs errors with full context

### 2. Auth Context (`lib/auth-context.tsx`)

- Logs authentication state changes
- Tracks login/logout events
- Records token validation attempts
- Logs user profile operations

### 3. Auth Pages

- **Login Page**: Logs form submissions and validation
- **Register Page**: Logs registration attempts and validation
- **Email Verification**: Logs verification attempts

## Log Levels

### Debug
- Detailed information for debugging
- Token retrieval/validation
- Authentication checks
- API request details

### Info
- General application flow
- Successful operations
- User actions
- Authentication events

### Warn
- Non-critical issues
- Validation failures
- API errors (4xx responses)
- Authentication warnings

### Error
- Critical failures
- Network errors
- Authentication failures
- Unexpected exceptions

## Environment Variables

### Development Setup

Create a `.env.local` file:

```bash
# Enable development mode
NEXT_PUBLIC_ENV=development

# API configuration
API_BASE_URL=http://localhost/api
```

### Production Setup

```bash
# Production mode (no logging)
NEXT_PUBLIC_ENV=production

# API configuration
API_BASE_URL=https://your-api-domain.com/api
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug('Token retrieved from storage', { hasToken: !!token });
logger.debug('User authenticated successfully', { userId, role });
logger.warn('Token validation failed', { reason: 'expired' });
logger.error('API request failed', error);

// ❌ Avoid
logger.info('Token retrieved from storage'); // Too verbose for info
logger.error('User clicked button'); // Not an error
```

### 2. Include Relevant Context

```typescript
// ✅ Good
logger.authEvent('Login successful', {
  userId: user.id,
  email: user.email,
  role: user.role
});

// ❌ Avoid
logger.authEvent('Login successful'); // Missing context
```

### 3. Use Convenience Methods

```typescript
// ✅ Good
logger.apiCall('POST', '/auth/login', credentials);
logger.authEvent('User logout');
logger.userAction('Form submitted', { formType: 'registration' });

// ❌ Avoid
logger.info('Making POST request to /auth/login with credentials');
```

### 4. Handle Sensitive Data

```typescript
// ✅ Good - Don't log passwords
logger.apiCall('POST', '/auth/login', { email: credentials.email });

// ❌ Avoid - Never log sensitive data
logger.apiCall('POST', '/auth/login', credentials); // Includes password
```

## Console Output Examples

### Development Mode

```bash
[2024-01-15T10:30:45.123Z] [ems-client] [INFO] AuthProvider initialized, checking authentication
[2024-01-15T10:30:45.124Z] [ems-client] [DEBUG] Token retrieved from storage { hasToken: true }
[2024-01-15T10:30:45.125Z] [ems-client] [DEBUG] API Call: GET http://localhost/api/auth/verify-token
[2024-01-15T10:30:45.200Z] [ems-client] [INFO] API Response: GET http://localhost/api/auth/verify-token - 200
[2024-01-15T10:30:45.201Z] [ems-client] [DEBUG] Token valid, fetching user profile
[2024-01-15T10:30:45.202Z] [ems-client] [DEBUG] API Call: GET http://localhost/api/auth/profile
[2024-01-15T10:30:45.250Z] [ems-client] [INFO] API Response: GET http://localhost/api/auth/profile - 200
[2024-01-15T10:30:45.251Z] [ems-client] [INFO] Auth Event: User authenticated successfully { userId: '123', email: 'user@example.com', role: 'USER' }
```

### Production Mode

```bash
# No console output - completely silent
```

## Testing

The logger can be tested by:

1. Setting `NEXT_PUBLIC_ENV=development` in your environment
2. Opening browser developer tools
3. Performing authentication actions
4. Observing console output

## Troubleshooting

### Logs Not Appearing

1. Check environment variables:
   ```bash
   echo $NEXT_PUBLIC_ENV
   ```

2. Verify you're in development mode:
   ```typescript
   console.log('Environment:', process.env.NODE_ENV);
   console.log('Public ENV:', process.env.NEXT_PUBLIC_ENV);
   ```

3. Check browser console is open and not filtered

### Too Many Logs

If logs are too verbose, you can:

1. Use higher log levels (warn/error only)
2. Add conditional logging:
   ```typescript
   if (process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true') {
     logger.debug('Detailed debug info');
   }
   ```

## Security Considerations

- **No sensitive data**: Passwords and tokens are never logged
- **Production safety**: Logs are completely disabled in production
- **Client-side only**: Logs only appear in browser console, not server logs
- **No data transmission**: Logs are not sent to external services
