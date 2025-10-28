# Speaker Service

## Overview
The Speaker Service is a microservice responsible for managing speaker profiles, invitations, messaging, and material uploads in the Event Management System. It handles the complete speaker lifecycle from discovery to engagement.

## Core Responsibilities

### 1. Speaker Profile Management
- Manages speaker profiles and expertise areas
- Provides speaker search and discovery functionality
- Handles speaker availability tracking

### 2. Invitation System
- Manages admin-to-speaker invitations
- Handles invitation response workflow
- Tracks invitation status and history

### 3. Messaging System
- Facilitates admin-to-speaker communication
- Manages message threading and history
- Integrates with notification service

### 4. Material Management
- Handles presentation material uploads
- Manages file validation and storage
- Organizes materials by event/session

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Message Queue**: RabbitMQ for event-driven communication
- **File Storage**: Local file system (can be extended to cloud storage)
- **Containerization**: Docker

## Project Structure

```
src/
├── middleware/
│   ├── auth.middleware.ts      # JWT authentication & authorization
│   ├── validation.middleware.ts # Request validation
│   └── error.middleware.ts     # Error handling
├── routes/
│   ├── speaker.routes.ts       # Speaker profile endpoints
│   ├── invitation.routes.ts    # Invitation management endpoints
│   ├── message.routes.ts       # Messaging endpoints
│   └── material.routes.ts      # Material upload endpoints
├── services/
│   ├── speaker.service.ts      # Core speaker business logic
│   ├── invitation.service.ts   # Invitation management logic
│   ├── message.service.ts      # Messaging logic
│   ├── material.service.ts     # Material management logic
│   └── event-publisher.service.ts # RabbitMQ event publishing
├── types/
│   ├── speaker.types.ts        # Speaker-related type definitions
│   ├── invitation.types.ts    # Invitation types
│   ├── message.types.ts        # Message types
│   ├── material.types.ts       # Material types
│   └── index.ts               # Type exports
├── database.ts                # Prisma database connection
├── server.ts                  # Express server setup
└── utils/
    └── logger.ts              # Logging utility
```

## API Endpoints

### Speaker Management
- `GET /api/speakers` - Get list of speakers with search
- `GET /api/speakers/:id` - Get speaker profile details
- `PUT /api/speakers/:id` - Update speaker profile
- `GET /api/speakers/search` - Search speakers by expertise

### Invitation Management
- `POST /api/invitations` - Send invitation to speaker
- `GET /api/invitations/pending` - Get pending invitations for speaker
- `PUT /api/invitations/:id/respond` - Speaker response to invitation
- `GET /api/invitations/sent` - Get invitations sent by admin

### Messaging
- `POST /api/messages` - Send message to speaker
- `GET /api/messages` - Get messages for user
- `PUT /api/messages/:id/read` - Mark message as read
- `GET /api/messages/conversation/:userId` - Get conversation thread

### Material Management
- `POST /api/materials` - Upload presentation material
- `GET /api/materials/speaker/:id` - Get speaker materials
- `DELETE /api/materials/:id` - Delete material
- `GET /api/materials/:id/download` - Download material

## Database Schema

### Speaker Profile Model
```prisma
model SpeakerProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  bio         String?
  expertise   String[]
  isAvailable Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  invitations SpeakerInvitation[]
  messages    Message[]
  materials   PresentationMaterial[]
  
  @@map("speaker_profiles")
}
```

### Speaker Invitation Model
```prisma
model SpeakerInvitation {
  id          String   @id @default(cuid())
  speakerId   String
  eventId     String
  message     String?
  status      InvitationStatus @default(PENDING)
  sentAt      DateTime @default(now())
  respondedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  speaker     SpeakerProfile @relation(fields: [speakerId], references: [id])
  
  @@map("speaker_invitations")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}
```

### Message Model
```prisma
model Message {
  id          String   @id @default(cuid())
  fromUserId  String
  toUserId    String
  subject     String
  content     String
  threadId    String?
  sentAt      DateTime @default(now())
  readAt      DateTime?
  createdAt   DateTime @default(now())
  
  @@map("messages")
}
```

### Presentation Material Model
```prisma
model PresentationMaterial {
  id          String   @id @default(cuid())
  speakerId   String
  eventId     String?
  fileName    String
  filePath    String
  fileSize    Int
  mimeType    String
  uploadDate  DateTime @default(now())
  
  speaker     SpeakerProfile @relation(fields: [speakerId], references: [id])
  
  @@map("presentation_materials")
}
```

## Environment Variables

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/speaker_service_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"

# RabbitMQ Configuration
RABBITMQ_URL="amqp://localhost:5672"

# File Upload Configuration
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="50MB"

# Server Configuration
PORT=3004
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
