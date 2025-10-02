# Event Service API Contract

## Base URL
```
http://localhost/api/event
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Response Format
All API responses follow this standard format:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  details?: any;
}
```

## Error Responses
```typescript
// Validation Error (400)
{
  success: false,
  error: "Validation failed",
  details: [
    { field: "name", message: "Event name is required" }
  ]
}

// Authentication Error (401)
{
  success: false,
  error: "Invalid token"
}

// Authorization Error (403)
{
  success: false,
  error: "Insufficient permissions"
}

// Not Found Error (404)
{
  success: false,
  error: "Event not found"
}
```

---

## Public Endpoints (No Authentication Required)

### 1. Get Published Events
**GET** `/events`

**Query Parameters:**
- `category` (string, optional): Filter by event category
- `venueId` (number, optional): Filter by venue ID
- `startDate` (string, optional): ISO date string - events starting from this date
- `endDate` (string, optional): ISO date string - events starting before this date
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    events: [
      {
        id: string;
        name: string;
        description: string;
        category: string;
        bannerImageUrl?: string;
        status: "PUBLISHED";
        speakerId: string;
        venueId: number;
        venue: {
          id: number;
          name: string;
          address: string;
          capacity: number;
          openingTime: string; // HH:mm format
          closingTime: string; // HH:mm format
        };
        bookingStartDate: string; // ISO date string
        bookingEndDate: string; // ISO date string
        createdAt: string; // ISO date string
        updatedAt: string; // ISO date string
      }
    ];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

**Example Request:**
```
GET /api/event/events?category=Technology&page=1&limit=10
```

### 2. Get Published Event Details
**GET** `/events/:id`

**Path Parameters:**
- `id` (string): Event ID

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description: string;
    category: string;
    bannerImageUrl?: string;
    status: "PUBLISHED";
    speakerId: string;
    venueId: number;
    venue: {
      id: number;
      name: string;
      address: string;
      capacity: number;
      openingTime: string;
      closingTime: string;
    };
    bookingStartDate: string;
    bookingEndDate: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

### 3. Get All Venues
**GET** `/venues`

**Query Parameters:**
- `name` (string, optional): Filter by venue name (partial match)
- `capacity` (number, optional): Minimum capacity
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    venues: [
      {
        id: number;
        name: string;
        address: string;
        capacity: number;
        openingTime: string; // HH:mm format
        closingTime: string; // HH:mm format
        createdAt: string; // ISO date string
        updatedAt: string; // ISO date string
      }
    ];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

### 4. Get All Venues (Simple List)
**GET** `/venues/all`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: number;
      name: string;
      address: string;
      capacity: number;
      openingTime: string;
      closingTime: string;
      createdAt: string;
      updatedAt: string;
    }
  ]
}
```

---

## Speaker Endpoints (SPEAKER Role Required)

### 1. Get Speaker's Events
**GET** `/events/my-events`

**Query Parameters:**
- `status` (string, optional): Filter by status ("DRAFT", "PENDING_APPROVAL", "REJECTED", "PUBLISHED", "CANCELLED", "COMPLETED")
- `category` (string, optional): Filter by category
- `venueId` (number, optional): Filter by venue ID
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    events: [
      {
        id: string;
        name: string;
        description: string;
        category: string;
        bannerImageUrl?: string;
        status: "DRAFT" | "PENDING_APPROVAL" | "REJECTED" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
        rejectionReason?: string; // Only present if status is "REJECTED"
        speakerId: string;
        venueId: number;
        venue: {
          id: number;
          name: string;
          address: string;
          capacity: number;
          openingTime: string;
          closingTime: string;
        };
        bookingStartDate: string;
        bookingEndDate: string;
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

### 2. Create New Event
**POST** `/events`

**Request Body:**
```typescript
{
  name: string; // Required, non-empty
  description: string; // Required, non-empty
  category: string; // Required, non-empty
  bannerImageUrl?: string; // Optional
  venueId: number; // Required, must exist
  bookingStartDate: string; // Required, ISO date string, must be in future
  bookingEndDate: string; // Required, ISO date string, must be after startDate
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description: string;
    category: string;
    bannerImageUrl?: string;
    status: "DRAFT";
    speakerId: string;
    venueId: number;
    venue: {
      id: number;
      name: string;
      address: string;
      capacity: number;
      openingTime: string;
      closingTime: string;
    };
    bookingStartDate: string;
    bookingEndDate: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

### 3. Update Event
**PUT** `/events/:id`

**Path Parameters:**
- `id` (string): Event ID

**Request Body:** (All fields optional)
```typescript
{
  name?: string; // Non-empty if provided
  description?: string; // Non-empty if provided
  category?: string; // Non-empty if provided
  bannerImageUrl?: string;
  venueId?: number; // Must exist if provided
  bookingStartDate?: string; // ISO date string, must be in future
  bookingEndDate?: string; // ISO date string, must be after startDate
}
```

**Constraints:**
- Can only update events with status "DRAFT" or "REJECTED"
- Can only update your own events

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response
  }
}
```

### 4. Submit Event for Approval
**PATCH** `/events/:id/submit`

**Path Parameters:**
- `id` (string): Event ID

**Constraints:**
- Can only submit events with status "DRAFT" or "REJECTED"
- Can only submit your own events

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response, but status will be "PENDING_APPROVAL"
  }
}
```

### 5. Delete Event
**DELETE** `/events/:id`

**Path Parameters:**
- `id` (string): Event ID

**Constraints:**
- Can only delete events with status "DRAFT"
- Can only delete your own events

**Response:**
```typescript
{
  success: true,
  message: "Event deleted successfully"
}
```

### 6. Get Speaker's Event Details
**GET** `/events/:id`

**Path Parameters:**
- `id` (string): Event ID

**Constraints:**
- Can only view your own events
- Shows all statuses and rejection reasons

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response, includes rejectionReason if applicable
  }
}
```

---

## Admin Endpoints (ADMIN Role Required)

### 1. Get All Events (Admin View)
**GET** `/admin/events`

**Query Parameters:**
- `status` (string, optional): Filter by any status
- `category` (string, optional): Filter by category
- `venueId` (number, optional): Filter by venue ID
- `speakerId` (string, optional): Filter by speaker ID
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    events: [
      {
        // Same as speaker events response, but includes all statuses
        // and rejectionReason for rejected events
      }
    ];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

### 2. Get Any Event Details (Admin View)
**GET** `/admin/events/:id`

**Path Parameters:**
- `id` (string): Event ID

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as speaker event details, but can view any event
  }
}
```

### 3. Approve Event
**PATCH** `/admin/events/:id/approve`

**Path Parameters:**
- `id` (string): Event ID

**Constraints:**
- Event must have status "PENDING_APPROVAL"
- Triggers event.published message to RabbitMQ

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response, but status will be "PUBLISHED"
  }
}
```

### 4. Reject Event
**PATCH** `/admin/events/:id/reject`

**Path Parameters:**
- `id` (string): Event ID

**Request Body:**
```typescript
{
  rejectionReason: string; // Required, minimum 10 characters
}
```

**Constraints:**
- Event must have status "PENDING_APPROVAL"

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response, but status will be "REJECTED"
    // and rejectionReason will be included
  }
}
```

### 5. Cancel Event
**PATCH** `/admin/events/:id/cancel`

**Path Parameters:**
- `id` (string): Event ID

**Constraints:**
- Event must have status "PUBLISHED"
- Triggers event.cancelled message to RabbitMQ

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create event response, but status will be "CANCELLED"
  }
}
```

### 6. Create Venue
**POST** `/admin/venues`

**Request Body:**
```typescript
{
  name: string; // Required, non-empty, must be unique
  address: string; // Required, non-empty
  capacity: number; // Required, must be > 0
  openingTime: string; // Required, HH:mm format (24-hour)
  closingTime: string; // Required, HH:mm format (24-hour)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    openingTime: string;
    closingTime: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

### 7. Update Venue
**PUT** `/admin/venues/:id`

**Path Parameters:**
- `id` (number): Venue ID

**Request Body:** (All fields optional)
```typescript
{
  name?: string; // Non-empty if provided, must be unique
  address?: string; // Non-empty if provided
  capacity?: number; // Must be > 0 if provided
  openingTime?: string; // HH:mm format if provided
  closingTime?: string; // HH:mm format if provided
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    // Same as create venue response
  }
}
```

### 8. Delete Venue
**DELETE** `/admin/venues/:id`

**Path Parameters:**
- `id` (number): Venue ID

**Constraints:**
- Cannot delete venue if it has associated events

**Response:**
```typescript
{
  success: true,
  message: "Venue deleted successfully"
}
```

### 9. Get Venues (Admin View)
**GET** `/admin/venues`

**Query Parameters:**
- `name` (string, optional): Filter by venue name
- `capacity` (number, optional): Minimum capacity
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    venues: [
      {
        id: number;
        name: string;
        address: string;
        capacity: number;
        openingTime: string;
        closingTime: string;
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

### 10. Get Venue Details (Admin View)
**GET** `/admin/venues/:id`

**Path Parameters:**
- `id` (number): Venue ID

**Response:**
```typescript
{
  success: true,
  data: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    openingTime: string;
    closingTime: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

---

## Event Status Flow

```
DRAFT → PENDING_APPROVAL → PUBLISHED → COMPLETED
  ↓           ↓              ↓
REJECTED   REJECTED      CANCELLED
  ↑
  └── Can be resubmitted
```

**Status Descriptions:**
- `DRAFT`: Speaker is creating/editing the event
- `PENDING_APPROVAL`: Submitted for admin review
- `REJECTED`: Admin rejected, speaker can edit and resubmit
- `PUBLISHED`: Approved and visible to public
- `CANCELLED`: Admin cancelled a published event
- `COMPLETED`: Event date has passed (automatic)

---

## Message Publishing Events

The Event Service publishes messages to RabbitMQ when certain actions occur:

### event.published
**Trigger:** Admin approves an event
**Routing Key:** `event.published`
**Payload:**
```typescript
{
  eventId: string;
  speakerId: string;
  name: string;
  capacity: number;
  bookingStartDate: string;
  bookingEndDate: string;
}
```

### event.updated
**Trigger:** Admin updates a published event
**Routing Key:** `event.updated`
**Payload:**
```typescript
{
  eventId: string;
  updatedFields: {
    // Only the fields that were updated
  };
}
```

### event.cancelled
**Trigger:** Admin cancels a published event
**Routing Key:** `event.cancelled`
**Payload:**
```typescript
{
  eventId: string;
}
```

---

## Health Check

**GET** `/health`

**Response:**
```typescript
{
  status: "healthy",
  service: "event-service",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

---

## Common Error Scenarios

1. **Invalid JWT Token**: 401 Unauthorized
2. **Expired Token**: 401 Unauthorized
3. **Insufficient Role**: 403 Forbidden
4. **Event Not Found**: 404 Not Found
5. **Venue Not Found**: 404 Not Found
6. **Validation Errors**: 400 Bad Request
7. **Business Logic Violations**: 400 Bad Request (e.g., trying to update non-draft event)
8. **Server Errors**: 500 Internal Server Error

---

## Frontend Integration Notes

1. **Authentication**: Store JWT token and include in Authorization header
2. **Error Handling**: Check `success` field and handle `error` messages
3. **Pagination**: Use `page` and `limit` parameters, display `totalPages`
4. **Date Handling**: All dates are ISO strings, convert as needed for display
5. **Time Format**: Venue times are in HH:mm format (24-hour)
6. **Status Management**: Handle different event statuses in UI
7. **Real-time Updates**: Consider WebSocket or polling for status changes
8. **File Uploads**: Banner images should be uploaded separately and URL provided
