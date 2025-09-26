# Event Management System – Domain Model (v1.0)

## 1. Scope Statement

The Event Management System (EMS) will provide the following capabilities:

- **Admins**
  - Create and manage events
  - Define and manage sessions within events

- **Attendees**
  - Browse available events
  - Register for events
  - Receive digital tickets for participation

- **Speakers**
  - Manage speaker profiles
  - Upload presentation materials (e.g., slides)
  - Participate in assigned sessions

- **Staff / Scanners**
  - Validate attendee tickets at the venue
  - Track attendance records

- **System (Automated)**
  - Send notifications and reminders to users
  - Collect feedback from attendees after events

---

## 2. Actors
- **Attendee** – browses events, registers, receives tickets, checks in, submits feedback.
- **Admin** – creates events, manages schedules, validates tickets, views reports.
- **Speaker** – manages profile, uploads slides, participates in sessions.
- **Staff / Scanner** – validates tickets at venue (subset of Admin role).
- **System** – sends notifications/reminders automatically.

---

## 3. Core Entities & Value Objects

### Entities
- **User**: `id, email, passwordHash, role {Admin,Speaker,Attendee}, createdAt`
- **SpeakerProfile**: `id, userId(FK), bio, slidesUrl?`
- **Event**: `id, title, description, venue, capacity, startAt, endAt, status {Draft,Published,Archived}`
- **SessionSlot**: `id, eventId(FK), title, room, startAt, endAt, capacity?`
- **SessionSpeaker (join)**: `id, sessionId(FK), speakerProfileId(FK)`
- **Registration**: `id, userId(FK), eventId(FK), status {Confirmed,Waitlisted,Cancelled}, createdAt`
- **Ticket**: `id, registrationId(FK), qrCode, status {Issued,Scanned,Revoked}, issuedAt, scannedAt?`
- **Attendance**: `id, ticketId(FK), eventId(FK), sessionId?(FK), scannedBy?(staffUserId), scanMethod {QR,Manual}, createdAt`
- **Notification**: `id, toUserId, type, payload, scheduledAt?, sentAt?, status`
- **Feedback**: `id, userId, eventId?, sessionId?, rating(1–5), comment?, createdAt`

### Value Objects
- **Email**
- **TimeRange**(startAt, endAt)
- **Venue**(name, address, city, lat/long)
- **Room**
- **Capacity**
- **QRCode**(data, format)
- **Role**

---

## 4. Relationships
- User 1 — 0..1 SpeakerProfile
- Event 1 — 0..* SessionSlot
- SessionSlot * — * SpeakerProfile (via SessionSpeaker)
- User 1 — 0..* Registration
- Event 1 — 0..* Registration
- Registration 1 — 0..1 Ticket
- Ticket 1 — 0..* Attendance

---

## 5. Invariants (Business Rules)
1. **Capacity**: confirmed registrations ≤ event.capacity.
2. **Single Active Registration** per (user,event).
3. **Waitlist**: if capacity reached → new registrations = Waitlisted.
4. **No Overlaps**: sessions in the same room cannot overlap.
5. **Ticket Lifecycle**: first scan sets `status=Scanned` + `scannedAt`; later scans only add Attendance rows.
6. **Feedback**: one feedback per user per event/session.
7. **Event Timing**: `startAt < endAt`; sessions must lie within event window.

---

## 6. Aggregates
- **Event** → owns `SessionSlot[]`.
- **Registration** → owns its `Ticket`.
- **User** → owns optional `SpeakerProfile`.

---

## 7. Domain Events
- `EventCreated`, `EventPublished`, `EventClosed`
- `RegistrationCreated`, `RegistrationConfirmed`, `RegistrationCancelled`, `MovedFromWaitlist`
- `TicketIssued`, `TicketScanned`, `TicketRevoked`
- `SlidesUploaded`
- `ReminderScheduled`, `ReminderSent`
- `FeedbackSubmitted`

---

## 8. Open Decisions (v1.0 assumptions)
- **Attendance** is a separate entity while still keeping `scannedAt` on Ticket.
- **Sessions** support multiple speakers via `SessionSpeaker`.
- Registration statuses simplified to `{Confirmed,Waitlisted,Cancelled}`.
- Notifications & Feedback modeled but will be implemented in later sprints.

---

## 9. Next Steps
- Produce **Class/Object Classifications (CRC cards)**.
- Create **UML Diagrams** (class, sequence, state, activity, deployment).
- Map **GoF Design Patterns** to relevant areas (Repository, Specification, Strategy, Observer, etc.).
