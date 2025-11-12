# Unit Tests Summary

This document summarizes the unit tests added for the messaging system and admin event update functionality.

## Test Files Created

### Speaker Service Tests

1. **`ems-services/speaker-service/src/services/__test__/message.service.test.ts`**
   - Tests for `MessageService.createMessage()` with new fields (eventId, status, attachment details)
   - Tests for admin methods:
     - `getAllSpeakerMessages()`
     - `getMessagesByEvent()`
     - `getMessagesBySpeaker()`
     - `getThreadsBySpeaker()`
     - `getUnreadSpeakerMessageCount()`
   - Tests for message status updates:
     - `markMessageAsDelivered()`
     - `markMessageAsRead()`

2. **`ems-services/speaker-service/src/routes/__test__/message.routes.test.ts`**
   - Tests for authentication enforcement on all message routes
   - Tests for authorization:
     - User-specific access (users can only access their own messages)
     - Admin-only access (admin methods)
     - Message creation authorization (speakers can send to admins, admins can send to anyone)

3. **`ems-services/speaker-service/src/services/__test__/websocket.service.test.ts`**
   - Tests for JWT authentication of WebSocket connections
   - Tests for room assignment:
     - User-specific rooms (`user:<id>`)
     - Admin room (`admins`)
   - Tests for `message:sent` event processing:
     - Marking messages as delivered if recipient is online
     - Emitting `message:received` to recipients
     - Emitting `message:new_speaker_message` to admins when message is from speaker
     - Emitting `message:delivered` confirmation to sender
   - Tests for `message:read` event processing:
     - Marking messages as read
     - Emitting `message:read_receipt` to sender
   - Tests for connection management

### Event Service Tests

4. **`ems-services/event-service/src/services/__test__/event.service.updateEventAsAdmin.test.ts`**
   - Tests for `updateEventAsAdmin()`:
     - Successfully updates event when called by admin
     - Publishes `event.updated` message if event is PUBLISHED
     - Does not publish message if event is not PUBLISHED
   - Tests for venue availability validation:
     - Validates venue availability for PUBLISHED events
     - Throws error if overlapping events exist
     - Allows update if no overlapping events
     - Does not validate for non-PUBLISHED events
   - Tests for booking date validation:
     - Ensures booking start date is before end date
     - Allows valid booking dates
     - Uses existing dates if only one date is provided
   - Error handling tests:
     - Event not found
     - Venue not found

5. **`ems-services/event-service/src/routes/__test__/admin.routes.updateEvent.test.ts`**
   - Tests for `PUT /admin/events/:id` endpoint:
     - Requires admin authentication
     - Validates request body fields:
       - `name` (cannot be empty)
       - `description` (cannot be empty)
       - `category` (cannot be empty)
       - `venueId` (must be valid number)
       - `bookingStartDate` (must be valid date)
       - `bookingEndDate` (must be valid date)
       - Booking dates (start must be before end)
     - Calls `updateEventAsAdmin` with correct parameters
     - Returns success response with updated event

## Test Setup Files

### Speaker Service

- **`ems-services/speaker-service/jest.config.ts`** - Jest configuration
- **`ems-services/speaker-service/src/test/env-setup.ts`** - Environment setup
- **`ems-services/speaker-service/src/test/mocks-simple.ts`** - Mock definitions
- **`ems-services/speaker-service/src/test/setup.ts`** - Test setup and teardown

## Test Coverage

### MessageService Tests
- ✅ `createMessage()` with all new fields
- ✅ Admin methods for retrieving and filtering messages
- ✅ Message status tracking (SENT, DELIVERED, READ)
- ✅ Thread management
- ✅ Pagination support

### Message Routes Tests
- ✅ Authentication enforcement
- ✅ User-specific authorization
- ✅ Admin-only authorization
- ✅ Message creation authorization

### WebSocketService Tests
- ✅ JWT authentication
- ✅ Room assignment (user-specific and admin rooms)
- ✅ `message:sent` event processing
- ✅ `message:read` event processing
- ✅ Real-time message delivery
- ✅ Admin notifications for speaker messages

### EventService.updateEventAsAdmin Tests
- ✅ Successful event updates by admin
- ✅ Message publishing for PUBLISHED events
- ✅ Venue availability validation
- ✅ Booking date validation
- ✅ Error handling

### Admin Routes Tests
- ✅ Admin authentication requirement
- ✅ Request body validation for all fields
- ✅ Route handler functionality

## Running the Tests

### Speaker Service
```bash
cd ems-services/speaker-service
npm test
```

### Event Service
```bash
cd ems-services/event-service
npm test
```

## Test Environment Setup

Before running tests, ensure you have:
1. Created `.env.test` files in both services with required environment variables:
   - `DATABASE_URL`
   - `RABBITMQ_URL`
   - `JWT_SECRET`
   - `PORT`
   - `CLIENT_URL` (for speaker-service)

2. Installed dependencies:
   ```bash
   npm install
   ```

3. Generated Prisma client:
   ```bash
   npm run prisma:generate
   ```

## Notes

- All tests use mocked Prisma client and external services
- Tests are isolated and do not require a running database or RabbitMQ
- Mock data factories are provided for creating test objects
- Tests follow the existing test patterns in the codebase

