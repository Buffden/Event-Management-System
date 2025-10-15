# Phase 1: Foundation (Weeks 1-2)

## Overview

Phase 1 focuses on establishing the foundational components of the Event Management System. These are the critical building blocks that everything else depends on.

**Priority**: CRITICAL - Must implement first
**Timeline**: Weeks 1-2
**Focus**: Get basic system working

---

## Use Cases in Phase 1

### 1. User Authentication & Profile Management
### 2. Event Creation & Management

---

## 1. User Authentication & Profile Management

### **User Flow (Plain English)**
```
User visits website → Clicks "Register" → Fills registration form (email, password, role) → 
System validates input → Creates user account → Sends confirmation email → 
User clicks confirmation link → Account activated → User can login → 
User enters credentials → System validates → Returns JWT token → 
User accesses dashboard → Can update profile information
```

### **Core Entities**
- **User**: `id, email, passwordHash, role, createdAt, isActive`
- **AuthSession**: `id, userId, refreshToken, expiresAt, userAgent, ipAddress`
- **UserProfile**: `id, userId, firstName, lastName, bio, phone, avatar`

### **Core Methods**
- `register(email, password, role)` - Create new user account
- `login(email, password)` - Authenticate user and return tokens
- `logout(sessionId)` - Invalidate user session
- `updateProfile(userId, profileData)` - Update user profile information
- `validateToken(token)` - Verify JWT token validity
- `refreshToken(refreshToken)` - Generate new access token

### **Design Patterns to Use**
- **Singleton**: AuthService for centralized authentication
- **Strategy**: PasswordHashingStrategy (bcrypt, argon2)
- **Factory**: TokenFactory for JWT creation
- **Repository**: UserRepository for data access

### **Business Rules**
- Unique email per user
- Password strength validation (min 8 chars, special chars)
- JWT token expiration (15 min access, 7 days refresh)
- Role-based access control (Admin, Speaker, Attendee)
- Account activation required via email

### **Implementation Priority**
1. User registration and validation
2. Login/logout functionality
3. JWT token management
4. Profile management
5. Password reset functionality

---

## 2. Event Creation & Management

### **User Flow (Plain English)**
```
Admin logs in → Navigates to "Create Event" → Fills event form (title, description, dates, venue, capacity) → 
System validates input → Creates event → Sets event status to "Draft" → 
Admin reviews event → Clicks "Publish" → Event becomes visible to users → 
Admin can edit event details → Admin can manage event capacity → 
Admin can archive completed events
```

### **Core Entities**
- **Event**: `id, title, description, startDate, endDate, venue, capacity, status, createdBy`
- **Venue**: `id, name, address, city, state, zipCode, coordinates, capacity`
- **SessionSlot**: `id, eventId, title, description, startTime, endTime, room, capacity, speakerId`

### **Core Methods**
- `createEvent(eventData)` - Create new event
- `updateEvent(eventId, eventData)` - Update event information
- `publishEvent(eventId)` - Make event visible to users
- `deleteEvent(eventId)` - Soft delete event
- `manageCapacity(eventId, newCapacity)` - Update event capacity
- `getEventById(eventId)` - Retrieve event details
- `listEvents(filters)` - Get events with filtering

### **Design Patterns to Use**
- **Factory**: EventFactory for creating different event types
- **Builder**: EventBuilder for complex event creation
- **Repository**: EventRepository for data access
- **Strategy**: EventValidationStrategy for different validation rules

### **Business Rules**
- Event dates must be in future
- Capacity must be positive integer
- Only admins can create/manage events
- Event status: Draft → Published → Archived
- Venue capacity must accommodate event capacity
- No overlapping events in same venue

### **Implementation Priority**
1. Event creation with validation
2. Event status management
3. Venue management
4. Session slot creation
5. Event listing and filtering

---

## Technical Implementation Details

### **Database Schema**
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Auth sessions table
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    venue_id UUID REFERENCES venues(id),
    capacity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
```
POST /auth/register - User registration
POST /auth/login - User login
POST /auth/logout - User logout
GET /auth/me - Get current user
PUT /auth/profile - Update user profile

POST /events - Create event (Admin only)
GET /events - List events
GET /events/:id - Get event details
PUT /events/:id - Update event (Admin only)
DELETE /events/:id - Delete event (Admin only)
```

### **Error Handling**
- Input validation errors
- Authentication failures
- Authorization errors (role-based)
- Database constraint violations
- Business rule violations

### **Security Considerations**
- Password hashing with salt
- JWT token security
- Input sanitization
- SQL injection prevention
- Rate limiting on auth endpoints

---

## Success Criteria

### **Week 1 Goals**
- [ ] User registration and login working
- [ ] JWT token management implemented
- [ ] Basic event creation functional
- [ ] Database schema deployed

### **Week 2 Goals**
- [ ] Profile management complete
- [ ] Event CRUD operations working
- [ ] Admin role validation
- [ ] Basic error handling
- [ ] API documentation

### **Testing Requirements**
- Unit tests for core methods
- Integration tests for API endpoints
- Authentication flow testing
- Event creation validation testing

---

## Next Phase Preview

**Phase 2** will build on this foundation to implement:
- Event discovery and registration
- Payment processing
- Digital ticketing system

The authentication system from Phase 1 will be used throughout the application, and the event management system will be extended with registration capabilities.
