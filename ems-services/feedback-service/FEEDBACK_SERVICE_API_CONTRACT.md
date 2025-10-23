# Feedback Service API Contract

## Overview

The Feedback Service handles feedback collection and management for events. It provides endpoints for creating feedback forms, submitting feedback responses, and retrieving analytics data.

**Base URL**: `http://localhost:3000/feedback`

## Authentication

All endpoints (except public ones) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Error Responses

All endpoints return errors in the following format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Additional error details"]
}
```

## Endpoints

### Feedback Form Management (Admin Only)

#### Create Feedback Form
**POST** `/forms`

Creates a new feedback form for an event.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Request Body:**
```json
{
  "eventId": "string",
  "title": "string",
  "description": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "eventId": "string",
    "title": "string",
    "description": "string",
    "isPublished": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Feedback form created successfully"
}
```

#### Update Feedback Form
**PUT** `/forms/:id`

Updates an existing feedback form.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "isPublished": "boolean (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "eventId": "string",
    "title": "string",
    "description": "string",
    "isPublished": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Feedback form updated successfully"
}
```

#### Delete Feedback Form
**DELETE** `/forms/:id`

Deletes a feedback form and all associated responses.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Response:**
```json
{
  "success": true,
  "message": "Feedback form deleted successfully"
}
```

#### Get Feedback Form
**GET** `/forms/:id`

Retrieves a specific feedback form with analytics.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "eventId": "string",
    "title": "string",
    "description": "string",
    "isPublished": true,
    "responseCount": 25,
    "averageRating": 4.2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### List Feedback Forms
**GET** `/forms?page=1&limit=10`

Lists all feedback forms with pagination.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "forms": [
      {
        "id": "string",
        "eventId": "string",
        "title": "string",
        "description": "string",
        "isPublished": true,
        "responseCount": 25,
        "averageRating": 4.2,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

### Public Endpoints

#### Get Feedback Form by Event ID
**GET** `/events/:eventId/form`

Retrieves the published feedback form for a specific event.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "eventId": "string",
    "title": "string",
    "description": "string",
    "isPublished": true,
    "responseCount": 25,
    "averageRating": 4.2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Feedback Submission

#### Submit Feedback
**POST** `/submit`

Submits feedback for an event.

**Headers:**
- `Authorization: Bearer <token>` (Any authenticated user)

**Request Body:**
```json
{
  "formId": "string",
  "bookingId": "string",
  "rating": 5,
  "comment": "string (optional, max 1000 characters)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "formId": "string",
    "userId": "string",
    "eventId": "string",
    "bookingId": "string",
    "rating": 5,
    "comment": "Great event!",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Feedback submitted successfully"
}
```

#### Get Feedback Submission
**GET** `/submissions/:id`

Retrieves a specific feedback submission.

**Headers:**
- `Authorization: Bearer <token>` (User can only view their own submissions)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "formId": "string",
    "userId": "string",
    "eventId": "string",
    "bookingId": "string",
    "rating": 5,
    "comment": "Great event!",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get User's Feedback Submissions
**GET** `/my-submissions?page=1&limit=10`

Retrieves all feedback submissions by the authenticated user.

**Headers:**
- `Authorization: Bearer <token>` (Any authenticated user)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": "string",
        "formId": "string",
        "userId": "string",
        "eventId": "string",
        "bookingId": "string",
        "rating": 5,
        "comment": "Great event!",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

### Admin Analytics

#### Get Event Feedback Submissions
**GET** `/events/:eventId/submissions?page=1&limit=10`

Retrieves all feedback submissions for a specific event.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": "string",
        "formId": "string",
        "userId": "string",
        "eventId": "string",
        "bookingId": "string",
        "rating": 5,
        "comment": "Great event!",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

#### Get Feedback Analytics
**GET** `/forms/:id/analytics`

Retrieves analytics for a specific feedback form.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Response:**
```json
{
  "success": true,
  "data": {
    "formId": "string",
    "eventId": "string",
    "totalResponses": 25,
    "averageRating": 4.2,
    "ratingDistribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 8,
      "5": 9
    },
    "responseRate": 83.33,
    "totalBookings": 30
  }
}
```

#### Get Event Feedback Analytics
**GET** `/events/:eventId/analytics`

Retrieves analytics for a specific event's feedback.

**Headers:**
- `Authorization: Bearer <token>` (Admin role required)

**Response:**
```json
{
  "success": true,
  "data": {
    "formId": "string",
    "eventId": "string",
    "totalResponses": 25,
    "averageRating": 4.2,
    "ratingDistribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 8,
      "5": 9
    },
    "responseRate": 83.33,
    "totalBookings": 30
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_TOKEN` | Authorization header missing |
| `INVALID_TOKEN` | Invalid or expired JWT token |
| `INSUFFICIENT_PERMISSIONS` | User doesn't have required role |
| `VALIDATION_ERROR` | Request validation failed |
| `FEEDBACK_FORM_NOT_FOUND` | Feedback form not found |
| `FEEDBACK_SUBMISSION_NOT_FOUND` | Feedback submission not found |
| `DUPLICATE_FEEDBACK_SUBMISSION` | Feedback already submitted for this booking |
| `INVALID_RATING` | Rating must be between 1 and 5 |
| `FEEDBACK_FORM_NOT_PUBLISHED` | Feedback form is not published |
| `ACCESS_DENIED` | User cannot access this resource |
| `DUPLICATE_RECORD` | Record already exists |
| `RECORD_NOT_FOUND` | Record not found in database |
| `INVALID_REFERENCE` | Invalid reference to related record |
| `DATABASE_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Internal server error |

## Business Rules

1. **Feedback Forms:**
   - Only one feedback form per event
   - Forms start as unpublished
   - Only published forms can receive submissions

2. **Feedback Submissions:**
   - One submission per booking
   - Rating must be between 1 and 5
   - Comments are optional but limited to 1000 characters
   - Users can only view their own submissions (unless admin)

3. **Analytics:**
   - Response rate calculated as (responses / total bookings) * 100
   - Rating distribution shows count for each rating (1-5)
   - Average rating calculated from all responses

4. **Permissions:**
   - Admin: Full access to all operations
   - Attendee/Speaker: Can submit feedback and view own submissions
   - Public: Can view published feedback forms

## Rate Limiting

- No specific rate limiting implemented
- Consider implementing rate limiting for production use

## Data Validation

- All string fields are trimmed
- Rating must be integer between 1-5
- Comments limited to 1000 characters
- Pagination limits: max 100 items per page
- Required fields validated on all endpoints
