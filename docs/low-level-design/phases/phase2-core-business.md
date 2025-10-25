# Phase 2: Core Business Logic (Weeks 3-4)

## Overview

Phase 2 builds upon the foundation established in Phase 1 to implement the core business logic that drives the Event Management System. This phase focuses on user booking, digital ticketing, and the essential workflows that make events functional.

**Priority**: CRITICAL - Core business functionality
**Timeline**: Weeks 3-4
**Focus**: Enable event participation and ticket management

---

## Use Cases in Phase 2

### 3. Event Discovery & Booking
### 4. Digital Ticketing System

---

## 3. Event Discovery & Booking

### **User Flow (Plain English)**
```
User visits homepage → Browses available events → Filters by date/category/location →
Selects an event → Views event details (description, schedule, speaker info) →
Clicks "Book" → System checks availability → If available: User fills booking form →
System validates input → Creates booking → If full: User joins waitlist →
System sends confirmation email → User receives ticket via email →
Admin can view booking list → Admin can manage capacity →
Admin can approve/reject waitlist entries
```

### **Core Entities**
- **Booking**: `id, userId, eventId, status, bookingDate, specialRequests, ticketId`
- **Waitlist**: `id, userId, eventId, position, requestDate, status`
- **EventCategory**: `id, name, description, color`
- **BookingStatus**: `PENDING, CONFIRMED, CANCELLED, WAITLISTED`

### **Core Methods**
- `browseEvents(filters)` - Get events with filtering and pagination
- `bookForEvent(userId, eventId, bookingData)` - Create new booking
- `joinWaitlist(userId, eventId)` - Add user to waitlist
- `approveWaitlist(waitlistId)` - Move waitlist entry to confirmed
- `cancelBooking(bookingId)` - Cancel existing booking
- `getBookingStatus(bookingId)` - Check booking status
- `manageEventCapacity(eventId, newCapacity)` - Update event capacity

### **Design Patterns to Use**
- **Repository**: BookingRepository, WaitlistRepository
- **Strategy**: BookingValidationStrategy for different event types
- **Observer**: BookingObserver for notifications
- **Factory**: BookingFactory for different booking types
- **Command**: BookingCommand for undo/redo operations

### **Business Rules**
- Booking opens only for published events
- Users can only book once per event
- Booking closes 24 hours before event start
- Waitlist position based on first-come-first-served
- Special requests limited to 200 characters
- Maximum 10 active bookings per user

### **Implementation Priority**
1. Event browsing and filtering
2. Booking creation and validation
3. Waitlist management
4. Capacity checking and updates
5. Booking status tracking

---

## 4. Digital Ticketing System

### **User Flow (Plain English)**
```
Booking confirmed → System automatically generates ticket →
Creates unique QR code → Associates QR with ticket →
Sends ticket via email to user → User receives email with ticket PDF →
User arrives at event → Staff scans QR code →
System validates ticket → Updates attendance status →
If valid: User gains entry → If invalid: Shows error message →
Admin can view attendance reports → Admin can generate attendance analytics
```

### **Core Entities**
- **Ticket**: `id, bookingId, status, issuedAt, scannedAt, expiresAt, createdAt, updatedAt`
- **QRCode**: `id, ticketId, data, format, scanCount, createdAt, updatedAt`
- **TicketStatus**: `ISSUED, SCANNED, REVOKED, EXPIRED`
- **ScanMethod**: `QR_CODE, MANUAL`
- **AttendanceRecord**: `id, ticketId, scanTime, scanLocation, scannedBy, scanMethod, createdAt`

**Note**: Access `userId` and `eventId` via `booking.userId` and `booking.eventId`. Access QR code data via `qrCode.data`. Single source of truth for expiration via `ticket.expiresAt`.

### **Core Methods**
- `generateTicket(bookingId)` - Create ticket with QR code
- `sendTicketEmail(ticketId)` - Email ticket to user
- `validateTicket(qrCodeData)` - Check ticket validity
- `scanTicket(qrCodeData, location, scannedBy)` - Record attendance
- `revokeTicket(ticketId)` - Invalidate ticket
- `generateAttendanceReport(eventId)` - Create attendance analytics
- `resendTicket(ticketId)` - Resend ticket to user
- `updateTicketStatus(ticketId, newStatus)` - Update ticket status
- `isTicketExpired(ticketId)` - Check if ticket is expired

### **Design Patterns to Use**
- **Factory**: TicketFactory for ticket generation
- **Strategy**: QRCodeGenerationStrategy for different QR formats
- **Template Method**: TicketTemplate for email generation
- **Observer**: TicketObserver for scan events
- **Singleton**: QRCodeService for centralized QR management

### **Business Rules**
- One ticket per booking
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
-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    booking_date TIMESTAMP DEFAULT NOW(),
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

-- Tickets table (normalized - no redundant fields)
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    status "TicketStatus" DEFAULT 'ISSUED',
    issued_at TIMESTAMP DEFAULT NOW(),
    scanned_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QR Codes table (normalized - no expiresAt, access via ticket.expires_at)
CREATE TABLE qr_codes (
    id TEXT PRIMARY KEY,
    ticket_id TEXT UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    data TEXT UNIQUE NOT NULL,
    format TEXT DEFAULT 'PNG',
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE attendance_records (
    id TEXT PRIMARY KEY,
    ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
    scan_time TIMESTAMP DEFAULT NOW(),
    scan_location TEXT,
    scanned_by TEXT,
    scan_method "ScanMethod" DEFAULT 'QR_CODE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance (only essential indexes)
CREATE INDEX qr_codes_data_idx ON qr_codes(data);
CREATE INDEX attendance_records_ticket_id_idx ON attendance_records(ticket_id);
CREATE INDEX attendance_records_scan_time_idx ON attendance_records(scan_time);

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
POST /events/:id/book - Book for event
POST /events/:id/waitlist - Join event waitlist
GET /bookings - Get user's bookings
PUT /bookings/:id/cancel - Cancel booking

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
- **Notification Service**: Send booking confirmations
- **Event Service**: Update capacity and availability

### **Error Handling**
- Booking conflicts and duplicates
- Capacity exceeded scenarios
- Invalid QR code handling
- Email delivery failures
- Waitlist management errors
- Ticket expiration handling

### **Security Considerations**
- QR code encryption and validation
- Ticket fraud prevention
- Rate limiting on booking endpoints
- Input validation for booking data
- Secure ticket storage and transmission

---

## Success Criteria

### **Week 3 Goals**
- [ ] Event browsing and filtering working
- [ ] User booking system functional
- [ ] Waitlist management implemented
- [ ] Basic ticket generation working

### **Week 4 Goals**
- [ ] Complete digital ticketing system
- [ ] QR code scanning and validation
- [ ] Email delivery system integrated
- [ ] Attendance tracking operational
- [ ] Admin reporting features

### **Testing Requirements**
- Booking flow testing
- Ticket generation and validation testing
- QR code scanning accuracy testing
- Email delivery testing
- Waitlist management testing
- Capacity management testing

---

## Dependencies from Phase 1

- **User Authentication**: All booking requires valid user accounts
- **Event Management**: Booking depends on published events
- **Database Schema**: Extends existing user and event tables
- **API Infrastructure**: Builds upon established API patterns

## Next Phase Preview

Phase 3 will extend the system with advanced features including speaker management, session scheduling, and enhanced attendance tracking with real-time analytics.
