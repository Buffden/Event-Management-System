# Feedback Service

## Overview

The Feedback Service is responsible for managing feedback collection and analytics for events in the Event Management System. It provides a decoupled way to collect, store, and analyze feedback from event attendees.

## Core Responsibilities

- **Feedback Form Management**: Create and manage feedback forms for events
- **Feedback Collection**: Collect and store ratings and comments from attendees
- **Analytics**: Provide data for the Analytics Service with comprehensive feedback insights
- **Data Validation**: Ensure data integrity and business rule compliance

## Features

### Feedback Form Management
- Create feedback forms for events (Admin only)
- Update form details and publication status
- Delete forms and associated responses
- List all forms with pagination

### Feedback Collection
- Submit feedback responses (authenticated users)
- One submission per booking to prevent duplicates
- Rating system (1-5 scale)
- Optional text comments (max 1000 characters)
- Form must be published to accept submissions

### Analytics & Reporting
- Response rate calculations
- Average rating computation
- Rating distribution analysis
- Event-specific feedback analytics
- Form-specific feedback analytics

### Security & Access Control
- JWT-based authentication
- Role-based access control (Admin, Attendee, Speaker)
- Users can only view their own submissions
- Public access to published forms only

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Message Queue**: RabbitMQ (for future integrations)
- **Logging**: Custom logger utility

## Project Structure

```
src/
├── database.ts                 # Prisma client configuration
├── server.ts                   # Express server setup
├── middleware/
│   ├── auth.middleware.ts      # Authentication & authorization
│   ├── validation.middleware.ts # Request validation
│   └── error.middleware.ts     # Error handling
├── routes/
│   ├── index.ts               # Route aggregation
│   └── feedback.routes.ts     # Feedback endpoints
├── services/
│   ├── feedback.service.ts    # Core business logic
│   ├── auth-validation.service.ts # Auth service integration
│   ├── context.service.ts     # Request context
│   └── rabbitmq.service.ts    # Message queue service
├── types/
│   └── feedback.types.ts      # TypeScript type definitions
└── utils/
    └── logger.ts              # Logging utility
```

## Database Schema

### FeedbackForm
- `id`: Unique identifier
- `eventId`: Associated event ID (unique)
- `title`: Form title
- `description`: Optional form description
- `isPublished`: Publication status
- `createdAt`/`updatedAt`: Timestamps

### FeedbackResponse
- `id`: Unique identifier
- `formId`: Reference to feedback form
- `userId`: User who submitted feedback
- `eventId`: Event being reviewed (denormalized for performance)
- `bookingId`: Booking reference (unique constraint)
- `rating`: Numeric rating (1-5)
- `comment`: Optional text comment
- `createdAt`/`updatedAt`: Timestamps

## API Endpoints

### Admin Endpoints
- `POST /feedback/forms` - Create feedback form
- `PUT /feedback/forms/:id` - Update feedback form
- `DELETE /feedback/forms/:id` - Delete feedback form
- `GET /feedback/forms` - List all forms
- `GET /feedback/forms/:id` - Get specific form
- `GET /feedback/events/:eventId/submissions` - Get event submissions
- `GET /feedback/forms/:id/analytics` - Get form analytics
- `GET /feedback/events/:eventId/analytics` - Get event analytics

### User Endpoints
- `POST /feedback/submit` - Submit feedback
- `GET /feedback/submissions/:id` - Get specific submission
- `GET /feedback/my-submissions` - Get user's submissions

### Public Endpoints
- `GET /feedback/events/:eventId/form` - Get published form

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/feedback_db"

# JWT
JWT_SECRET="your-jwt-secret"

# Server
PORT=3000
NODE_ENV="development"

# RabbitMQ (optional)
RABBITMQ_URL="amqp://localhost:5672"
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate
   ```

4. **Start the service:**
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Business Rules

### Feedback Forms
1. Only one feedback form per event
2. Forms start as unpublished
3. Only published forms can receive submissions
4. Deleting a form removes all associated responses

### Feedback Submissions
1. One submission per booking (enforced by unique constraint)
2. Rating must be integer between 1-5
3. Comments are optional but limited to 1000 characters
4. Users can only view their own submissions (unless admin)
5. Form must be published to accept submissions

### Analytics
1. Response rate = (responses / total bookings) * 100
2. Rating distribution shows count for each rating (1-5)
3. Average rating calculated from all responses
4. Analytics available for both forms and events

## Error Handling

The service implements comprehensive error handling with:
- Custom error classes for different error types
- Prisma error mapping
- JWT validation errors
- Request validation errors
- Consistent error response format

## Security Considerations

- JWT token validation on all protected endpoints
- Role-based access control
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- Rate limiting (to be implemented)

## Integration Points

### Dependencies
- **Auth Service**: User authentication and role validation
- **Event Service**: Event information and validation
- **Booking Service**: Booking validation for submissions

### Future Integrations
- **Analytics Service**: Provide feedback data for reporting
- **Notification Service**: Send feedback request notifications
- **Email Service**: Send feedback confirmation emails

## Monitoring & Logging

- Structured logging with request context
- Error tracking and monitoring
- Performance metrics (to be implemented)
- Health check endpoint at `/health`

## Testing

The service includes:
- Unit tests for business logic
- Integration tests for API endpoints
- Database tests with test fixtures
- Error handling tests

Run tests with:
```bash
npm test
npm run test:coverage
```

## Deployment

### Docker
```bash
# Build image
docker build -t feedback-service .

# Run container
docker run -p 3000:3000 feedback-service
```

### Environment-specific Configuration
- Development: `.env.local`
- Production: `.env.production`
- Test: `.env.test`

## API Documentation

For detailed API documentation, see [FEEDBACK_SERVICE_API_CONTRACT.md](./FEEDBACK_SERVICE_API_CONTRACT.md)

## Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Update API documentation
4. Follow the existing code structure
5. Use meaningful commit messages

## License

This project is part of the Event Management System.