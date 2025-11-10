import axios from 'axios';
import { logger } from './logger';

const authServiceUrl = process.env.GATEWAY_URL ?
  `${process.env.GATEWAY_URL}/api/auth` : 'http://ems-gateway/api/auth';

/**
 * Get user information from auth service
 */
export async function getUserInfo(userId: string): Promise<{ name: string | null; email: string; role: string } | null> {
  try {
    const response = await axios.get(`${authServiceUrl}/internal/users/${userId}`, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service': 'feedback-service'
      }
    });

    if (response.status === 200 && response.data.valid && response.data.user) {
      return {
        name: response.data.user.name || null,
        email: response.data.user.email,
        role: response.data.user.role
      };
    }
    return null;
  } catch (error) {
    logger.warn('Failed to fetch user info from auth service', { userId, error: (error as Error).message });
    return null;
  }
}

