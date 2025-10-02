# Auth Service API Contract

## Base URL
```
http://localhost/api/auth
```

## Authentication
Protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Response Format
All API responses follow this standard format:
```typescript
{
  success?: boolean;
  message?: string;
  token?: string;
  user?: User;
  error?: string;
  exists?: boolean;
  valid?: boolean;
}
```

## Error Responses
```typescript
// Validation Error (400)
{
  error: "Email is required"
}

// Authentication Error (401)
{
  error: "Invalid email or password"
}

// Authorization Error (403)
{
  error: "Insufficient permissions"
}

// Not Found Error (404)
{
  error: "User not found"
}
```

---

## Data Types

### User Object
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "ADMIN" | "USER" | "SPEAKER";
  isActive: boolean;
  emailVerified: string | null; // ISO date string
}
```

### Role Types
- `ADMIN`: System administrator with full access
- `USER`: Regular user/attendee
- `SPEAKER`: Event speaker with event creation permissions

---

## Public Endpoints (No Authentication Required)

### 1. User Registration
**POST** `/register`

**Request Body:**
```typescript
{
  email: string; // Required, valid email format
  password: string; // Required, minimum 8 characters
  name?: string; // Optional
  role?: "USER" | "SPEAKER"; // Optional, defaults to "USER", ADMIN not allowed
  image?: string; // Optional, profile image URL
}
```

**Constraints:**
- Only `USER` and `SPEAKER` roles allowed for registration
- `ADMIN` roles must be created manually
- Email must be unique
- Password will be hashed and stored securely

**Response:**
```typescript
{
  message: "Registration successful! Please check your email to verify your account.",
  token: string; // JWT token (30 days expiry)
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "USER" | "SPEAKER";
    isActive: false; // Will be true after email verification
    emailVerified: null;
  }
}
```

**Error Scenarios:**
- `400`: User already exists and is active
- `400`: Account suspended
- `400`: User exists but not verified (verification email resent)
- `400`: Invalid role provided
- `400`: Email/password validation failed

**Example Request:**
```json
{
  "email": "speaker@example.com",
  "password": "securepassword123",
  "name": "John Speaker",
  "role": "SPEAKER"
}
```

### 2. User Login
**POST** `/login`

**Request Body:**
```typescript
{
  email: string; // Required
  password: string; // Required
}
```

**Response:**
```typescript
{
  message: "Login successful",
  token: string; // JWT token (30 days expiry)
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "ADMIN" | "USER" | "SPEAKER";
    isActive: true;
    emailVerified: string; // ISO date string
  }
}
```

**Error Scenarios:**
- `400`: Invalid email or password
- `400`: Account not active (email not verified)
- `400`: User not found

**Example Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### 3. Check User Exists
**GET** `/check-user`

**Query Parameters:**
- `email` (string, required): Email to check

**Response:**
```typescript
{
  message: "User exists",
  exists: boolean;
}
```

**Example Request:**
```
GET /api/auth/check-user?email=user@example.com
```

### 4. Verify JWT Token
**POST** `/verify-token`

**Request Body:**
```typescript
{
  token: string; // Required, JWT token to verify
}
```

**Response:**
```typescript
// Success (200)
true

// Error (400)
{
  error: "Verification token is missing."
}
```

**Example Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Email Verification
**GET** `/verify-email`

**Query Parameters:**
- `token` (string, required): Email verification token

**Response:**
```typescript
{
  success: true,
  message: "Email verified successfully",
  token: string; // New JWT token (30 days expiry)
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "USER" | "SPEAKER";
    isActive: true;
    emailVerified: string; // ISO date string
  }
}
```

**Error Scenarios:**
- `400`: Verification token is required
- `400`: Invalid verification link
- `400`: Verification link has expired
- `400`: Email is already verified

**Example Request:**
```
GET /api/auth/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Google OAuth Authentication
**GET** `/google`

**Description:** Initiates Google OAuth2 authentication flow

**Response:** Redirects to Google OAuth consent screen

**Example Request:**
```
GET /api/auth/google
```

### 7. Google OAuth Callback
**GET** `/google/callback`

**Description:** Handles callback from Google after authentication

**Response:**
```typescript
{
  message: "Google authentication successful!",
  token: string; // JWT token (30 days expiry)
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: "USER"; // Default role for OAuth users
    isActive: true;
    emailVerified: string; // ISO date string
  }
}
```

**Error Scenarios:**
- `401`: Authentication failed via Google
- `500`: Internal error during authentication

---

## Protected Endpoints (Authentication Required)

### 1. Get User Profile
**GET** `/profile`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```typescript
{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "ADMIN" | "USER" | "SPEAKER";
  isActive: boolean;
  emailVerified: string | null; // ISO date string
}
```

**Error Scenarios:**
- `401`: Invalid or missing token
- `400`: User not found

### 2. Update User Profile
**PUT** `/profile`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```typescript
{
  name?: string | null; // Optional
  image?: string | null; // Optional, profile image URL
  currentPassword?: string; // Required if changing password
  newPassword?: string; // Required if changing password
}
```

**Constraints:**
- Password change requires both `currentPassword` and `newPassword`
- Password change not available for OAuth accounts
- Current password must be correct

**Response:**
```typescript
{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "ADMIN" | "USER" | "SPEAKER";
  isActive: boolean;
  emailVerified: string | null; // ISO date string
}
```

**Error Scenarios:**
- `401`: Invalid or missing token
- `400`: User not found
- `400`: Password change not available for OAuth accounts
- `400`: Current password is required
- `400`: Current password is incorrect

**Example Request:**
```json
{
  "name": "Updated Name",
  "image": "https://example.com/profile.jpg",
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

### 3. Logout
**POST** `/logout`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Description:** Stateless logout - client should discard the JWT token

**Response:**
```typescript
{
  success: true,
  message: "Logged out"
}
```

### 4. Get Current User Context
**GET** `/me`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```typescript
{
  userId: string;
  email: string;
  role: "ADMIN" | "USER" | "SPEAKER";
  requestId: string; // For request tracing
  timestamp: string; // ISO date string
}
```

**Error Scenarios:**
- `401`: No user context available
- `400`: Context retrieval failed

---

## Health Check

### Health Check
**GET** `/health`

**Response:**
```typescript
{
  status: "ok",
  timestamp: "2024-01-01T00:00:00.000Z",
  service: "auth-service",
  requestId: "req_123456789"
}
```

---

## JWT Token Structure

### Token Payload
```typescript
{
  userId: string;
  email: string;
  role: "ADMIN" | "USER" | "SPEAKER";
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expires at (Unix timestamp)
}
```

### Token Expiry
- **Access Token**: 30 days
- **Email Verification Token**: 1 hour

---

## Email Verification Flow

1. **User registers** → Account created with `isActive: false`
2. **Verification email sent** → Contains 1-hour expiry token
3. **User clicks link** → Calls `/verify-email` endpoint
4. **Email verified** → `isActive: true`, `emailVerified: timestamp`
5. **User logged in** → New 30-day JWT token issued

---

## OAuth Integration

### Google OAuth Flow
1. **User clicks "Login with Google"** → Redirects to `/google`
2. **Google consent screen** → User authorizes application
3. **Google callback** → `/google/callback` processes response
4. **User created/linked** → JWT token issued
5. **User logged in** → Redirected to frontend with token

### OAuth User Creation Rules
- **New users**: Created with `USER` role by default
- **Existing users**: Google account linked to existing email
- **Email verification**: Automatically verified for OAuth users
- **Password**: Not required for OAuth users

---

## Error Handling

### Common Error Scenarios

1. **Invalid Credentials**
   ```typescript
   { error: "Invalid email or password" }
   ```

2. **Account Not Active**
   ```typescript
   { error: "Your account is not active. Please verify your email first." }
   ```

3. **User Already Exists**
   ```typescript
   { error: "User with this email already exists." }
   ```

4. **Account Suspended**
   ```typescript
   { error: "Your account has been suspended. Please contact support." }
   ```

5. **Invalid Role**
   ```typescript
   { error: "Only USER and SPEAKER roles are allowed for registration. ADMIN roles must be created manually." }
   ```

6. **Token Expired**
   ```typescript
   { error: "Verification link has expired." }
   ```

7. **OAuth Password Change**
   ```typescript
   { error: "Password change not available for OAuth accounts." }
   ```

---

## Frontend Integration Notes

### Authentication Flow
1. **Registration/Login** → Store JWT token in localStorage/sessionStorage
2. **API Requests** → Include token in Authorization header
3. **Token Expiry** → Handle 401 responses, redirect to login
4. **Logout** → Remove token from storage

### Email Verification
1. **Registration** → Show "Check your email" message
2. **Email Link** → Handle verification callback
3. **Success** → Store new token and redirect to dashboard

### OAuth Integration
1. **Google Login Button** → Redirect to `/google` endpoint
2. **Callback Handling** → Extract token from response
3. **Token Storage** → Store JWT token for API requests

### Profile Management
1. **Profile Display** → Use `/profile` endpoint
2. **Profile Updates** → Use PUT `/profile` endpoint
3. **Password Changes** → Require current password validation

### Error Handling
1. **Network Errors** → Show generic error message
2. **Validation Errors** → Display specific field errors
3. **Authentication Errors** → Redirect to login page
4. **Authorization Errors** → Show access denied message

### Security Considerations
1. **Token Storage** → Use secure storage methods
2. **HTTPS Only** → Ensure all requests use HTTPS in production
3. **Token Refresh** → Implement token refresh logic
4. **Logout** → Clear all stored authentication data
