# Event Service

The Event Service is a microservice responsible for managing events and venues in the Event Management System. It handles the complete event lifecycle from creation to completion, including approval workflows and venue management.

## Core Responsibilities

### Event Lifecycle Management
- Manages events from initial DRAFT creation through PENDING_APPROVAL and REJECTED states
- Handles PUBLISHED, COMPLETED, and CANCELLED states
- Enforces business rules for state transitions

### Venue Management
- Provides CRUD operations for venue information
- Validates venue capacity and operating hours
- Ensures venue availability for events

### Catalog Service
- Acts as the central catalog providing event and venue information
- Serves data to other services (Booking Service) and the frontend
- Supports filtering and pagination for efficient data retrieval

### Event Publisher
- Publishes messages to RabbitMQ when event states change
- Enables other microservices to react to event lifecycle changes
- Supports event.published, event.updated, and event.cancelled messages

## Key Workflows

### Event Creation & Approval Workflow
1. **Speaker creates event** → Status: DRAFT
2. **Speaker updates event** → Only allowed in DRAFT/REJECTED states
3. **Speaker submits event** → Status: PENDING_APPROVAL
4. **Admin reviews event** → Views list of pending events
5. **Admin approves** → Status: PUBLISHED + publishes event.published message
6. **Admin rejects** → Status: REJECTED + adds rejectionReason
7. **Speaker can resubmit** → After addressing rejection reason

### Public Event Discovery Workflow
1. **Any user requests events** → Gets list of PUBLISHED events
2. **Filtering capabilities** → By date, category, venue
3. **View event details** → Full details of PUBLISHED events

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/events` - Get list of PUBLISHED events with filtering
- `GET /api/events/:id` - Get public details of a PUBLISHED event
- `GET /api/venues` - Get list of all available venues
- `GET /api/venues/all` - Get all venues (for dropdowns)

### Speaker Endpoints (SPEAKER Role Required)
- `GET /api/events/my-events` - Get speaker's events
- `POST /api/events` - Create new event (DRAFT)
- `PUT /api/events/:id` - Update event (DRAFT/REJECTED only)
- `PATCH /api/events/:id/submit` - Submit for approval
- `DELETE /api/events/:id` - Delete event (DRAFT only)
- `GET /api/events/:id` - Get speaker's own event details

### Admin Endpoints (ADMIN Role Required)
- `GET /api/admin/events` - Get all events with filtering
- `GET /api/admin/events/:id` - Get any event details
- `PATCH /api/admin/events/:id/approve` - Approve event
- `PATCH /api/admin/events/:id/reject` - Reject event
- `PATCH /api/admin/events/:id/cancel` - Cancel event
- `POST /api/admin/venues` - Create venue
- `PUT /api/admin/venues/:id` - Update venue
- `DELETE /api/admin/venues/:id` - Delete venue
- `GET /api/admin/venues` - Get venues with admin filtering
- `GET /api/admin/venues/:id` - Get venue details

## Event Publishing

The service publishes messages to RabbitMQ when key actions occur:

### event.published
- **Trigger**: Admin approves an event
- **Payload**: `{ eventId, speakerId, name, capacity, bookingStartDate, bookingEndDate }`
- **Consumers**: Booking Service, Notification Service

### event.updated
- **Trigger**: Admin updates PUBLISHED event details
- **Payload**: `{ eventId, updatedFields: {...} }`
- **Consumers**: Booking Service

### event.cancelled
- **Trigger**: Admin cancels a PUBLISHED event
- **Payload**: `{ eventId }`
- **Consumers**: Booking Service, Notification Service

## Database Schema

### Event Model
```prisma
model Event {
  id             String      @id @default(cuid())
  name           String
  description    String      @db.Text
  category       String
  bannerImageUrl String?
  status         EventStatus @default(DRAFT)
  rejectionReason String?    @db.Text
  speakerId      String
  venueId        Int
  venue          Venue       @relation(fields: [venueId], references: [id])
  bookingStartDate DateTime
  bookingEndDate   DateTime
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

### Venue Model
```prisma
model Venue {
  id          Int    @id @default(autoincrement())
  name        String @unique
  address     String @db.Text
  capacity    Int
  openingTime String
  closingTime String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  events      Event[]
}
```

### Event Status Enum
```prisma
enum EventStatus {
  DRAFT
  PENDING_APPROVAL
  REJECTED
  PUBLISHED
  CANCELLED
  COMPLETED
}
```

## Environment Variables

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/event_service_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"

# RabbitMQ Configuration
RABBITMQ_URL="amqp://localhost:5672"

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up database**:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start the service**:
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

### Project Structure
```
src/
├── middleware/          # Authentication, validation, error handling
├── routes/             # API route definitions
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (logger, etc.)
├── database.ts         # Database connection
└── server.ts           # Main server file
```

## Authentication & Authorization

The service uses JWT tokens for authentication and role-based authorization:

- **Public endpoints**: No authentication required
- **Speaker endpoints**: Require SPEAKER role
- **Admin endpoints**: Require ADMIN role

JWT tokens should be included in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Error Handling

The service includes comprehensive error handling:
- Validation errors with detailed field information
- Authentication and authorization errors
- Business logic errors with descriptive messages
- Database errors with appropriate HTTP status codes

## Logging

Structured logging is implemented using a custom logger that includes:
- Timestamp and service name
- Request ID for tracing
- User ID when available
- Error details with stack traces
- Performance metrics

## Testing

The service is designed to be testable with:
- Dependency injection for services
- Mockable external dependencies (database, RabbitMQ)
- Comprehensive error handling for edge cases
- Input validation for all endpoints

## Monitoring & Health Checks

- Health check endpoint: `GET /health`
- Structured logging for monitoring
- Graceful shutdown handling
- Database connection monitoring
- RabbitMQ connection monitoring