// Centralized API configuration
export const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// Environment-specific configurations
export const getApiBaseUrl = (service?: string): string => {
  const baseUrl = apiConfig.baseURL;

  if (service) {
    return `${baseUrl}/${service}`;
  }

  return baseUrl;
};

// Service-specific endpoints
export const apiEndpoints = {
  auth: getApiBaseUrl('auth'),
  event: getApiBaseUrl('event'),
  booking: getApiBaseUrl('booking'),
  user: getApiBaseUrl('user'),
  notification: getApiBaseUrl('notification'),
} as const;
