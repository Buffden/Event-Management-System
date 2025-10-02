// Authentication and authorization types
export interface AuthContext {
  userId: string;
  role: 'ADMIN' | 'SPEAKER' | 'ATTENDEE';
  email: string;
}

export interface JWTPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: AuthContext;
}
