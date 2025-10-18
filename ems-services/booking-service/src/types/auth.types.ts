import { Request } from 'express';

// Authentication-related types
export interface AuthUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'SPEAKER';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// JWT payload structure
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
