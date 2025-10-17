# Use Case Flows

## User Flows in Plain English

Following the LLD tutorial approach, these flows are written in plain English to understand user behavior and extract entities and methods.

---

## **Phase 1: Foundation Flows**

### 1. User Authentication & Profile Management

**User Flow:**
```
User visits website → Clicks "Register" → Fills registration form (email, password, role) → 
System validates input → Creates user account → Sends confirmation email → 
User clicks confirmation link → Account activated → User can login → 
User enters credentials → System validates → Returns JWT token → 
User accesses dashboard → Can update profile information
```

**Core Entities Identified:**
- User (id, email, passwordHash, role, createdAt)
- AuthSession (id, userId, refreshToken, expiresAt)
- UserProfile (id, userId, firstName, lastName, bio)

**Core Methods:**
- register(email, password, role)
- login(email, password)
- logout(sessionId)
- updateProfile(userId, profileData)
- validateToken(token)

---

### 2. Event Creation & Management

**User Flow:**
```
Admin logs in → Navigates to "Create Event" → Fills event form (title, description, dates, venue, capacity) → 
System validates input → Creates event → Sets event status to "Draft" → 
Admin reviews event → Clicks "Publish" → Event becomes visible to users → 
Admin can edit event details → Admin can manage event capacity → 
Admin can archive completed events
```

**Core Entities Identified:**
- Event (id, title, description, startDate, endDate, venue, capacity, status)
- Venue (id, name, address, city, coordinates)
- SessionSlot (id, eventId, title, startTime, endTime, room, capacity)

**Core Methods:**
- createEvent(eventData)
- updateEvent(eventId, eventData)
- publishEvent(eventId)
- deleteEvent(eventId)
- manageCapacity(eventId, newCapacity)

---

## **Phase 2: Core Business Logic Flows**

### 3. Event Discovery & Registration

**User Flow:**
```
User visits homepage → Browses available events → Applies filters (date, location, category) → 
Selects event → Views event details → Clicks "Register" → 
System checks if user is logged in → If not, redirects to login → 
User logs in → Returns to registration → System checks event capacity → 
If capacity available: confirms registration → If full: adds to waitlist → 
User receives confirmation → Registration status updated
```

**Core Entities Identified:**
- Event (id, title, description, startDate, endDate, venue, capacity, status)
- Registration (id, userId, eventId, status, createdAt)
- User (id, email, role)

**Core Methods:**
- browseEvents(filters)
- searchEvents(query, filters)
- registerForEvent(userId, eventId)
- handleWaitlist(userId, eventId)
- checkCapacity(eventId)

---

### 4. Digital Ticketing System

**User Flow:**
```
Registration confirmed → System generates unique ticket → Creates QR code → 
Sends ticket via email → User receives email with ticket → 
User can view ticket in dashboard → Downloads ticket for offline use → 
Ticket contains event details, QR code, user information → 
System tracks ticket status → Updates status when scanned
```

**Core Entities Identified (Normalized Schema):**
- Ticket (id, bookingId, status, issuedAt, scannedAt, expiresAt, createdAt, updatedAt)
- QRCode (id, ticketId, data, format, scanCount, createdAt, updatedAt)
- AttendanceRecord (id, ticketId, scanTime, scanLocation, scannedBy, scanMethod, createdAt)
- Booking (id, userId, eventId, status, createdAt, updatedAt)

**Data Access Patterns:**
- Access userId/eventId via: `ticket.booking.userId`, `ticket.booking.eventId`
- Access QR code data via: `ticket.qrCode.data`
- Access expiration via: `ticket.expiresAt` (single source of truth)

**Core Methods:**
- generateTicket(bookingId)
- sendTicketEmail(ticketId)
- updateTicketStatus(ticketId, newStatus)
- validateQRCode(qrCodeData)
- scanTicket(qrCodeData, location, scannedBy)
- generateAttendanceReport(eventId)

---

## **Phase 3: Advanced Features Flows**

### 5. Speaker Profile & Materials Management

**User Flow:**
```
Speaker logs in → Navigates to "My Profile" → Updates speaker bio and expertise → 
Uploads presentation materials → System validates file types and sizes → 
Organizes materials by session → Speaker can view assigned sessions → 
Updates materials for specific sessions → System notifies admin of updates
```

**Core Entities Identified:**
- SpeakerProfile (id, userId, bio, expertise, materials)
- PresentationMaterial (id, speakerId, sessionId, fileName, filePath, uploadDate)
- SessionSlot (id, eventId, title, speakerId)

**Core Methods:**
- createProfile(userId, profileData)
- uploadMaterial(speakerId, sessionId, file)
- updateProfile(speakerId, profileData)
- organizeMaterials(speakerId, sessionId)

---

### 6. Speaker-Event Assignment

**User Flow:**
```
Admin creates event → Navigates to speaker assignment → Selects speakers from available list → 
Assigns speakers to specific sessions → System sends invitation to speakers → 
Speaker receives notification → Reviews assignment details → Accepts or rejects assignment → 
If accepted: Speaker is confirmed for session → If rejected: Admin can assign different speaker → 
Admin can modify assignments before event starts → System tracks assignment status
```

**Core Entities Identified:**
- SpeakerAssignment (id, eventId, sessionId, speakerId, status, assignedAt, acceptedAt)
- Event (id, title, startDate, endDate, status)
- SessionSlot (id, eventId, title, startTime, endTime, speakerId)
- SpeakerProfile (id, userId, bio, expertise, availability)

**Core Methods:**
- assignSpeakerToEvent(eventId, speakerId)
- assignSpeakerToSession(sessionId, speakerId)
- acceptAssignment(assignmentId, speakerId)
- rejectAssignment(assignmentId, speakerId)
- removeSpeakerAssignment(assignmentId)

---

### 7. Multi-Track Session Management

**User Flow:**
```
Admin creates event → Decides to add multiple tracks → Creates track (e.g., "Technical Track", "Business Track") → 
Adds sessions to each track → Assigns speakers to track-specific sessions → 
Manages track capacity and timing → Ensures no conflicts between tracks → 
Publishes multi-track event → Attendees can choose tracks during registration → 
System manages track-specific attendance and materials
```

**Core Entities Identified:**
- EventTrack (id, eventId, name, description, capacity, startTime, endTime)
- SessionSlot (id, eventId, trackId, title, startTime, endTime, speakerId)
- TrackAssignment (id, trackId, sessionId, assignedAt)
- Event (id, title, startDate, endDate, isMultiTrack)

**Core Methods:**
- createTrack(eventId, trackData)
- assignSessionToTrack(sessionId, trackId)
- manageTrackSchedule(eventId, trackId)
- updateTrackCapacity(trackId, newCapacity)
- removeTrack(trackId)

---

### 8. Schedule Management

**User Flow:**
```
Admin creates event → Adds session slots → Assigns speakers to sessions → 
System checks speaker availability → Validates no scheduling conflicts → 
Creates event schedule → Speakers receive notifications → 
Admin can modify schedule → System updates all affected parties → 
Schedule published to attendees
```

**Core Entities Identified:**
- SessionSlot (id, eventId, title, startTime, endTime, room, speakerId)
- SpeakerProfile (id, userId, bio, availability)
- Event (id, title, startDate, endDate, status)

**Core Methods:**
- createSession(eventId, sessionData)
- assignSpeaker(sessionId, speakerId)
- manageSchedule(eventId, scheduleData)
- validateAvailability(speakerId, timeSlot)

---

### 9. Ticket Validation & Attendance Tracking

**User Flow:**
```
Attendee arrives at venue → Presents QR code → Staff scans code → 
System validates ticket → Checks if already scanned → 
If valid: records attendance → Updates ticket status → 
Shows confirmation to attendee → Tracks real-time attendance → 
Admin can view attendance dashboard → Generates attendance reports
```

**Core Entities Identified:**
- Ticket (id, registrationId, qrCode, status, scannedAt)
- Attendance (id, ticketId, eventId, sessionId, scannedBy, scanTime)
- StaffUser (id, userId, role, permissions)

**Core Methods:**
- validateTicket(qrCode)
- recordAttendance(ticketId, staffId)
- trackCheckins(eventId)
- generateAttendanceReport(eventId)

---

## **Phase 4: Enhancement Flows**

### 10. Automated Notifications

**User Flow:**
```
System triggers notification event → Determines notification type → 
Selects appropriate template → Personalizes message → 
Sends via email/push → Tracks delivery status → 
Handles delivery failures → Retries if necessary → 
Updates notification status → Logs delivery history
```

**Core Entities Identified:**
- Notification (id, userId, type, message, status, sentAt)
- EmailTemplate (id, type, subject, body, variables)
- User (id, email, notificationPreferences)

**Core Methods:**
- sendNotification(userId, type, data)
- scheduleReminder(userId, eventId, reminderTime)
- handleEmailDelivery(notificationId)
- trackDeliveryStatus(notificationId)

---

### 11. Feedback Collection & Reporting

**User Flow:**
```
Event ends → System sends feedback request → User clicks feedback link → 
Fills feedback form (rating, comments) → Submits feedback → 
System validates input → Stores feedback → 
Admin views feedback dashboard → Generates reports → 
Exports data for analysis → Tracks feedback trends
```

**Core Entities Identified:**
- Feedback (id, userId, eventId, sessionId, rating, comment, submittedAt)
- Report (id, type, data, generatedAt, generatedBy)
- Event (id, title, endDate, status)

**Core Methods:**
- collectFeedback(userId, eventId, feedbackData)
- generateReport(reportType, filters)
- viewAnalytics(eventId)
- exportFeedbackData(eventId)

---

## Entity Extraction Summary

From these flows, the core entities are:
- **User, AuthSession, UserProfile**
- **Event, SessionSlot, Venue, EventTrack**
- **Registration, Ticket, QRCode, Attendance**
- **SpeakerProfile, PresentationMaterial, SpeakerAssignment**
- **TrackAssignment, Notification, EmailTemplate, Feedback, Report**

## Method Extraction Summary

Core methods identified:
- **Authentication**: register(), login(), logout(), validateToken()
- **Event Management**: createEvent(), updateEvent(), publishEvent()
- **Registration**: registerForEvent(), handleWaitlist(), checkCapacity()
- **Ticketing**: generateTicket(), sendTicket(), validateTicket()
- **Speaker Assignment**: assignSpeakerToEvent(), acceptAssignment(), rejectAssignment()
- **Multi-Track**: createTrack(), assignSessionToTrack(), manageTrackSchedule()
- **Attendance**: recordAttendance(), trackCheckins(), generateReport()
