# Phase 2: Core Business Logic (Weeks 3-4)

## Overview

Phase 2 builds upon the foundation established in Phase 1 to implement the core business logic that drives the Event Management System. This phase focuses on user registration, digital ticketing, and the essential workflows that make events functional.

**Priority**: CRITICAL - Core business functionality
**Timeline**: Weeks 3-4
**Focus**: Enable event participation and ticket management

---

## Use Cases in Phase 2

### 3. Event Discovery & Registration
### 4. Digital Ticketing System

---

## 3. Event Discovery & Registration

### **User Flow (Plain English)**
```
User visits homepage → Browses available events → Filters by date/category/location → 
Selects an event → Views event details (description, schedule, speaker info) → 
Clicks "Register" → System checks availability → If available: User fills registration form → 
System validates input → Creates registration → If full: User joins waitlist → 
System sends confirmation email → User receives ticket via email → 
Admin can view registration list → Admin can manage capacity → 
Admin can approve/reject waitlist entries
```

### **Core Entities**
- **Registration**: `id, userId, eventId, status, registrationDate, specialRequests, ticketId`
- **Waitlist**: `id, userId, eventId, position, requestDate, status`
- **EventCategory**: `id, name, description, color`
- **RegistrationStatus**: `PENDING, CONFIRMED, CANCELLED, WAITLISTED`

### **Core Methods**
- `browseEvents(filters)` - Get events with filtering and pagination
- `registerForEvent(userId, eventId, registrationData)` - Create new registration
- `joinWaitlist(userId, eventId)` - Add user to waitlist
- `approveWaitlist(waitlistId)` - Move waitlist entry to confirmed
- `cancelRegistration(registrationId)` - Cancel existing registration
- `getRegistrationStatus(registrationId)` - Check registration status
- `manageEventCapacity(eventId, newCapacity)` - Update event capacity

### **Design Patterns to Use**
- **Repository**: RegistrationRepository, WaitlistRepository
- **Strategy**: RegistrationValidationStrategy for different event types
- **Observer**: RegistrationObserver for notifications
- **Factory**: RegistrationFactory for different registration types
- **Command**: RegistrationCommand for undo/redo operations

### **Business Rules**
- Registration opens only for published events
- Users can only register once per event
- Registration closes 24 hours before event start
- Waitlist position based on first-come-first-served
- Special requests limited to 200 characters
- Maximum 10 active registrations per user

### **Implementation Priority**
1. Event browsing and filtering
2. Registration creation and validation
3. Waitlist management
4. Capacity checking and updates
5. Registration status tracking

---

## 4. Digital Ticketing System

### **User Flow (Plain English)**
```
Registration confirmed → System automatically generates ticket → 
Creates unique QR code → Associates QR with ticket → 
Sends ticket via email to user → User receives email with ticket PDF → 
User arrives at event → Staff scans QR code → 
System validates ticket → Updates attendance status → 
If valid: User gains entry → If invalid: Shows error message → 
Admin can view attendance reports → Admin can generate attendance analytics
```

### **Core Entities**
- **Ticket**: `id, registrationId, qrCode, status, issuedAt, eventId, userId`
- **QRCode**: `id, ticketId, data, createdAt, scanCount`
- **TicketStatus**: `ISSUED, SCANNED, REVOKED, EXPIRED`
- **AttendanceRecord**: `id, ticketId, scanTime, scanLocation, scannedBy`

### **Core Methods**
- `generateTicket(registrationId)` - Create ticket with QR code
- `sendTicketEmail(ticketId)` - Email ticket to user
- `validateTicket(qrCode)` - Check ticket validity
- `scanTicket(qrCode, location)` - Record attendance
- `revokeTicket(ticketId)` - Invalidate ticket
- `generateAttendanceReport(eventId)` - Create attendance analytics
- `resendTicket(ticketId)` - Resend ticket to user

### **Design Patterns to Use**
- **Factory**: TicketFactory for ticket generation
- **Strategy**: QRCodeGenerationStrategy for different QR formats
- **Template Method**: TicketTemplate for email generation
- **Observer**: TicketObserver for scan events
- **Singleton**: QRCodeService for centralized QR management

### **Business Rules**
- One ticket per registration
- QR codes expire 2 hours after event end
- Tickets cannot be transferred between users
- Maximum 3 ticket resends per user
- QR codes are unique and non-reusable
- Attendance data retained for 1 year

### **Implementation Priority**
1. Automatic ticket generation
2. QR code creation and management
3. Email delivery system
4. Ticket validation and scanning
5. Attendance tracking and reporting

---

## Technical Implementation Details

### **Database Schema**
```sql
-- Registrations table
CREATE TABLE registrations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    registration_date TIMESTAMP DEFAULT NOW(),
    special_requests TEXT,
    ticket_id UUID REFERENCES tickets(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Waitlist table
CREATE TABLE waitlist (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    position INTEGER NOT NULL,
    request_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    registration_id UUID REFERENCES registrations(id),
    qr_code VARCHAR(500) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ISSUED',
    issued_at TIMESTAMP DEFAULT NOW(),
    event_id UUID REFERENCES events(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id),
    scan_time TIMESTAMP DEFAULT NOW(),
    scan_location VARCHAR(255),
    scanned_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Event categories table
CREATE TABLE event_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
```
GET /events/browse - Browse events with filters
GET /events/:id/details - Get detailed event information
POST /events/:id/register - Register for event
POST /events/:id/waitlist - Join event waitlist
GET /registrations - Get user's registrations
PUT /registrations/:id/cancel - Cancel registration

GET /tickets/:id - Get ticket details
POST /tickets/:id/resend - Resend ticket email
POST /tickets/validate - Validate QR code
POST /tickets/scan - Scan ticket for attendance
GET /events/:id/attendance - Get attendance report
```

### **Integration Points**
- **Email Service**: Send ticket emails and notifications
- **QR Code Service**: Generate and validate QR codes
- **File Storage**: Store ticket PDFs and QR images
- **Notification Service**: Send registration confirmations
- **Event Service**: Update capacity and availability

### **Error Handling**
- Registration conflicts and duplicates
- Capacity exceeded scenarios
- Invalid QR code handling
- Email delivery failures
- Waitlist management errors
- Ticket expiration handling

### **Security Considerations**
- QR code encryption and validation
- Ticket fraud prevention
- Rate limiting on registration endpoints
- Input validation for registration data
- Secure ticket storage and transmission

---

## Success Criteria

### **Week 3 Goals**
- [ ] Event browsing and filtering working
- [ ] User registration system functional
- [ ] Waitlist management implemented
- [ ] Basic ticket generation working

### **Week 4 Goals**
- [ ] Complete digital ticketing system
- [ ] QR code scanning and validation
- [ ] Email delivery system integrated
- [ ] Attendance tracking operational
- [ ] Admin reporting features

### **Testing Requirements**
- Registration flow testing
- Ticket generation and validation testing
- QR code scanning accuracy testing
- Email delivery testing
- Waitlist management testing
- Capacity management testing

---

## Dependencies from Phase 1

- **User Authentication**: All registration requires valid user accounts
- **Event Management**: Registration depends on published events
- **Database Schema**: Extends existing user and event tables
- **API Infrastructure**: Builds upon established API patterns

## Next Phase Preview

Phase 3 will extend the system with advanced features including speaker management, session scheduling, and enhanced attendance tracking with real-time analytics.
