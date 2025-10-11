# Speaker Endpoint Usage Guide

## New Speaker Endpoint

### GET /:eventId/num-registered

This endpoint allows speakers to get the number of registered users (confirmed bookings) for their events.

## Usage Examples

### 1. Basic Request
```bash
curl -X GET "http://localhost:3000/clx1234567890abcdef/num-registered" \
  -H "Authorization: Bearer <speaker_jwt_token>"
```

### 2. Response Example
```json
{
  "success": true,
  "data": {
    "eventId": "clx1234567890abcdef",
    "totalUsers": 45,
    "confirmedBookings": 45,
    "cancelledBookings": 3
  }
}
```

### 3. Error Response Examples

#### Missing Event ID
```json
{
  "success": false,
  "error": "Invalid event ID format",
  "details": ["eventId must be a valid UUID or CUID"]
}
```

#### Invalid Event ID Format
```json
{
  "success": false,
  "error": "Invalid event ID format",
  "details": ["eventId must be a valid UUID or CUID"]
}
```

#### Unauthorized Access
```json
{
  "success": false,
  "error": "Speaker access required"
}
```

#### Event Not Found
```json
{
  "success": false,
  "error": "Event not found"
}
```

## Authentication Requirements

- **Role**: Must have `speaker` role in JWT token
- **Token**: Valid JWT token required in Authorization header
- **Format**: `Authorization: Bearer <jwt_token>`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventId` | string | Yes | Event ID (UUID or CUID format) in the URL path |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | The event ID that was queried |
| `totalUsers` | number | Number of confirmed bookings (active users) |
| `confirmedBookings` | number | Number of confirmed bookings |
| `cancelledBookings` | number | Number of cancelled bookings |

## Business Logic

1. **Event Validation**: Checks if the event exists in the local cache
2. **User Count**: Counts only CONFIRMED bookings as active users
3. **Statistics**: Provides breakdown of confirmed vs cancelled bookings
4. **Access Control**: Only speakers can access this endpoint

## Integration Notes

- This endpoint is designed for speakers to monitor their event attendance
- The `totalUsers` field represents the actual number of people who will attend
- Cancelled bookings are tracked separately for analytics purposes
- The event must exist in the booking service's local cache (populated via event.published messages)

## Testing

### Test with Valid Speaker Token
```bash
# Replace with actual speaker JWT token and event ID
curl -X GET "http://localhost:3000/your-event-id/num-registered" \
  -H "Authorization: Bearer your-speaker-jwt-token" \
  -H "Content-Type: application/json"
```

### Test with Invalid Role
```bash
# This should return 403 Forbidden
curl -X GET "http://localhost:3000/your-event-id/num-registered" \
  -H "Authorization: Bearer your-attendee-jwt-token" \
  -H "Content-Type: application/json"
```
