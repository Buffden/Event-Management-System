# Booking Service

## Overview
The Booking Service is a microservice that manages event registrations and booking operations for the Event Management System. It handles the complete registration flow, enforces booking rules, and provides both user-facing and admin operations.

## Core Responsibilities

### 1. Registration Flow Management
- Handles the entire process for an attendee registering for an event
- Validates booking requests against event capacity
- Prevents overbooking through capacity enforcement

### 2. Booking Status Management
- Manages booking statuses (CONFIRMED, CANCELLED)
- Enforces business rules for booking operations
- Handles booking cancellations and updates

### 3. User-Facing Operations
- Provides endpoints for authenticated users to create bookings
- Allows users to view their own bookings
- Enables users to cancel their registrations

### 4. Admin Oversight
- Offers secure endpoints for administrators to view all registrations
- Provides admin tools for managing bookings across events
- Supports admin override capabilities

## Event-Driven Communication

### Consumes Events
- **event.published**: Creates local event cache for capacity checks
- **event.cancelled**: Automatically cancels all associated bookings

### Publishes Events
- **booking.confirmed**: Triggers ticket generation and notification sending
- **booking.cancelled**: Triggers notification to inform users

## API Endpoints

### User Endpoints
- `POST /bookings` - Create a new booking
- `GET /bookings/my-bookings` - Get user's bookings
- `DELETE /bookings/:id` - Cancel a booking
- `GET /bookings/:id` - Get booking details
- `GET /bookings/event/:eventId/capacity` - Check event capacity

### Admin Endpoints
- `GET /admin/events/:eventId/bookings` - Get all bookings for an event
- `GET /admin/bookings` - Get all bookings (with filters)
- `GET /admin/events/:eventId/capacity` - Get event capacity details
- `GET /admin/bookings/:id` - Get any booking details
- `DELETE /admin/bookings/:id` - Cancel any booking (admin override)

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Message Queue**: RabbitMQ for event-driven communication
- **Authentication**: JWT tokens
- **Containerization**: Docker

## Project Structure

```
src/
├── middleware/
│   ├── auth.middleware.ts      # JWT authentication & authorization
│   ├── validation.middleware.ts # Request validation
│   └── error.middleware.ts     # Error handling
├── routes/
│   ├── booking.routes.ts       # User-facing booking endpoints
│   └── admin.routes.ts         # Admin-only endpoints
├── services/
│   ├── booking.service.ts      # Core booking business logic
│   ├── event-publisher.service.ts # RabbitMQ event publishing
│   └── event-consumer.service.ts  # RabbitMQ event consumption
├── types/
│   ├── booking.types.ts        # Booking-related type definitions
│   ├── auth.types.ts          # Authentication types
│   └── index.ts               # Type exports
├── database.ts                # Prisma database connection
├── server.ts                  # Express server setup
└── utils/
    └── logger.ts              # Logging utility
```

## Database Schema

### Event Model (Local Cache)
```prisma
model Event {
  id        String    @id
  capacity  Int
  isActive  Boolean   @default(true)
  bookings  Booking[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Booking Model
```prisma
model Booking {
  id      String        @id @default(cuid())
  userId  String
  eventId String
  status  BookingStatus @default(CONFIRMED)
  event   Event         @relation(fields: [eventId], references: [id])
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@unique([userId, eventId])
}
```

### Booking Status Enum
```prisma
enum BookingStatus {
  CONFIRMED
  CANCELLED
}
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://admin:password@localhost:5432/booking_db"

# JWT
JWT_SECRET="your-jwt-secret-key"

# RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# Server
PORT=3000
NODE_ENV=production
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- RabbitMQ
- Docker (optional)

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up Database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t booking-service .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="postgresql://admin:password@host.docker.internal:5432/booking_db" \
     -e JWT_SECRET="your-jwt-secret" \
     -e RABBITMQ_URL="amqp://guest:guest@host.docker.internal:5672" \
     booking-service
   ```

## Business Rules

1. **One Booking Per User Per Event**: A user can only have one booking per event
2. **Capacity Enforcement**: Bookings are rejected if event is at capacity
3. **Event Status**: Only active events can accept new bookings
4. **Ownership**: Users can only view/cancel their own bookings (unless admin)
5. **Automatic Cancellation**: All bookings are cancelled when an event is cancelled

## Event Flow

### Booking Creation Flow
1. User requests to book an event
2. Service validates event exists and is active
3. Service checks if user already has a booking
4. Service verifies event capacity
5. Service creates booking with CONFIRMED status
6. Service publishes `booking.confirmed` event
7. Ticket service generates QR code
8. Notification service sends confirmation email

### Event Cancellation Flow
1. Event service publishes `event.cancelled` event
2. Booking service receives the event
3. Service marks event as inactive
4. Service cancels all CONFIRMED bookings for the event
5. Service publishes `booking.cancelled` events for each booking
6. Notification service sends cancellation emails

## Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## Monitoring & Logging

- **Health Check**: `GET /health`
- **Structured Logging**: JSON format with correlation IDs
- **Error Tracking**: Comprehensive error handling and logging
- **Metrics**: Request/response logging for monitoring

## Security Features

- JWT token authentication for all endpoints
- Role-based access control (user vs admin)
- Input validation and sanitization
- SQL injection protection via Prisma ORM
- CORS configuration
- Rate limiting (infrastructure level)

## Performance Considerations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Prisma connection pooling
- **Event Caching**: Local event cache to avoid API calls
- **Async Processing**: Non-blocking event handling
- **Graceful Shutdown**: Proper cleanup on service termination

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Verify PostgreSQL is running
   - Ensure database exists

2. **RabbitMQ Connection Failed**
   - Check RABBITMQ_URL environment variable
   - Verify RabbitMQ is running
   - Check network connectivity

3. **JWT Token Invalid**
   - Verify JWT_SECRET matches auth service
   - Check token expiration
   - Ensure proper token format

4. **Event Not Found**
   - Verify event exists in event service
   - Check if event.published event was received
   - Verify event ID format

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and stack traces.

## Contributing

1. Follow TypeScript best practices
2. Write comprehensive tests
3. Update documentation
4. Follow existing code style
5. Add proper error handling
6. Include logging for important operations

## License

This project is part of the Event Management System.
