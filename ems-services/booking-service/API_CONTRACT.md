# Booking Service API Contract

## Overview
The Booking Service manages event registrations and booking operations for the Event Management System. It handles the complete registration flow, enforces booking rules, and provides user-facing, speaker, and admin operations.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Endpoints

### 1. Create Booking
**POST** `/bookings`

Creates a new booking for the authenticated user and specified event.

**Request Body:**
```typescript
{
  eventId: string; // Required, valid UUID or CUID
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    userId: string;
    eventId: string;
    status: "CONFIRMED";
    event: {
      id: string;
      capacity: number;
      isActive: boolean;
    };
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid eventId, missing fields)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (user role not allowed)
- `404` - Event not found
- `409` - Event fully booked or user already has booking

### 2. Get User Bookings
**GET** `/bookings/my-bookings`

Retrieves all bookings for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by booking status (`CONFIRMED`, `CANCELLED`)
- `eventId` (optional): Filter by specific event ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    bookings: [
      {
        id: string;
        userId: string;
        eventId: string;
        status: "CONFIRMED" | "CANCELLED";
        event: {
          id: string;
          capacity: number;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
      }
    ];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

### 3. Cancel Booking
**DELETE** `/bookings/:id`

Cancels a specific booking owned by the authenticated user.

**Path Parameters:**
- `id`: Booking ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    userId: string;
    eventId: string;
    status: "CANCELLED";
    event: {
      id: string;
      capacity: number;
      isActive: boolean;
    };
    createdAt: string;
    updatedAt: string;
  },
  message: "Booking cancelled successfully"
}
```

**Error Responses:**
- `400` - Invalid booking ID format
- `403` - Access denied (not your booking)
- `404` - Booking not found
- `409` - Booking already cancelled

### 4. Get Booking Details
**GET** `/bookings/:id`

Retrieves details of a specific booking.

**Path Parameters:**
- `id`: Booking ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    userId: string;
    eventId: string;
    status: "CONFIRMED" | "CANCELLED";
    event: {
      id: string;
      capacity: number;
      isActive: boolean;
    };
    createdAt: string;
    updatedAt: string;
  }
}
```

### 5. Check Event Capacity
**GET** `/bookings/event/:eventId/capacity`

Checks the current capacity status of an event.

**Path Parameters:**
- `eventId`: Event ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    isAvailable: boolean;
    currentBookings: number;
    capacity: number;
    remainingSlots: number;
  }
}
```

## Speaker Endpoints

### 1. Get Number of Registered Users for Event
**GET** `/:eventId/num-registered`

Retrieves the number of registered users (confirmed bookings) for a specific event (speaker only).

**Path Parameters:**
- `eventId` (required): Event ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    eventId: string;
    totalUsers: number;        // Number of confirmed bookings (active users)
    confirmedBookings: number; // Number of confirmed bookings
    cancelledBookings: number; // Number of cancelled bookings
  }
}
```

**Error Responses:**
- `400` - Invalid eventId format
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (speaker access required)
- `404` - Event not found

## Admin Endpoints

### 1. Get Event Bookings
**GET** `/admin/events/:eventId/bookings`

Retrieves all bookings for a specific event (admin only).

**Path Parameters:**
- `eventId`: Event ID (UUID or CUID)

**Query Parameters:**
- `status` (optional): Filter by booking status
- `userId` (optional): Filter by specific user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    bookings: [
      {
        id: string;
        userId: string;
        eventId: string;
        status: "CONFIRMED" | "CANCELLED";
        event: {
          id: string;
          capacity: number;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
      }
    ];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

### 2. Get All Bookings
**GET** `/admin/bookings`

Retrieves all bookings across all events (admin only).

**Query Parameters:**
- `eventId` (required): Event ID to filter by
- `status` (optional): Filter by booking status
- `userId` (optional): Filter by specific user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
Same as Get Event Bookings

### 3. Get Event Capacity (Admin)
**GET** `/admin/events/:eventId/capacity`

Gets detailed capacity information for an event (admin only).

**Path Parameters:**
- `eventId`: Event ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    isAvailable: boolean;
    currentBookings: number;
    capacity: number;
    remainingSlots: number;
  }
}
```

### 4. Get Booking Details (Admin)
**GET** `/admin/bookings/:id`

Retrieves details of any booking (admin only).

**Path Parameters:**
- `id`: Booking ID (UUID or CUID)

**Response:**
Same as Get Booking Details

### 5. Cancel Booking (Admin)
**DELETE** `/admin/bookings/:id`

Cancels any booking (admin override).

**Path Parameters:**
- `id`: Booking ID (UUID or CUID)

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    userId: string;
    eventId: string;
    status: "CANCELLED";
    event: {
      id: string;
      capacity: number;
      isActive: boolean;
    };
    createdAt: string;
    updatedAt: string;
  },
  message: "Booking cancelled successfully by admin"
}
```

## Health Check

### Health Status
**GET** `/health`

Returns the service health status.

**Response:**
```typescript
{
  status: "healthy",
  service: "booking-service",
  timestamp: string,
  rabbitmq: boolean
}
```

## Error Response Format

All error responses follow this format:
```typescript
{
  success: false,
  error: string,
  details?: any // Only in development mode
}
```

## Event-Driven Communication

### Published Events

#### Booking Confirmed
**Exchange:** `booking_events`
**Routing Key:** `booking.confirmed`

```typescript
{
  bookingId: string;
  userId: string;
  eventId: string;
  createdAt: string;
}
```

#### Booking Cancelled
**Exchange:** `booking_events`
**Routing Key:** `booking.cancelled`

```typescript
{
  bookingId: string;
  userId: string;
  eventId: string;
  cancelledAt: string;
}
```

### Consumed Events

#### Event Published
**Exchange:** `event_events`
**Routing Key:** `event.published`

```typescript
{
  eventId: string;
  capacity: number;
}
```

#### Event Cancelled
**Exchange:** `event_events`
**Routing Key:** `event.cancelled`

```typescript
{
  eventId: string;
}
```

## Business Rules

1. **One Booking Per User Per Event**: A user can only have one booking per event
2. **Capacity Enforcement**: Bookings are rejected if event is at capacity
3. **Event Status**: Only active events can accept new bookings
4. **Ownership**: Users can only view/cancel their own bookings (unless admin)
5. **Automatic Cancellation**: All bookings are cancelled when an event is cancelled

## Rate Limiting

- No specific rate limiting implemented
- Relies on infrastructure-level rate limiting

## Security

- JWT token authentication required for all endpoints
- Role-based access control (user vs admin)
- Input validation and sanitization
- SQL injection protection via Prisma ORM
