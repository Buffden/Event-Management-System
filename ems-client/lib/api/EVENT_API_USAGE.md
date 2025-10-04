# Event API Usage Guide

This document provides comprehensive examples for using the Event API client in the EMS client application.

## Import

```typescript
import { eventAPI } from '@/lib/api/event.api';
```

## Public Endpoints (No Authentication Required)

### 1. Get Published Events
```typescript
// Get all published events
const response = await eventAPI.getPublishedEvents();

// Get published events with filters
const response = await eventAPI.getPublishedEvents({
  category: 'Technology',
  venueId: 1,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  limit: 10
});

console.log(response.data.events); // Array of EventResponse
console.log(response.data.total); // Total count
```

### 2. Get Published Event by ID
```typescript
const response = await eventAPI.getPublishedEventById('event-id-123');
console.log(response.data); // EventResponse
```

### 3. Get Venues
```typescript
// Get all venues
const response = await eventAPI.getVenues();

// Get venues with filters
const response = await eventAPI.getVenues({
  name: 'Conference',
  capacity: 100,
  page: 1,
  limit: 10
});

console.log(response.data.venues); // Array of VenueResponse
```

### 4. Get All Venues (for dropdowns)
```typescript
const response = await eventAPI.getAllVenues();
console.log(response.data); // Array of VenueResponse (no pagination)
```

## Speaker Endpoints (SPEAKER Role Required)

### 1. Get My Events
```typescript
// Get all events for a specific speaker
const response = await eventAPI.getMyEvents('speaker-user-id');

// Note: Filters are applied on the client side after receiving all events
// The server returns all events for the speaker, client handles filtering
const allEvents = response.data.events;

// Apply client-side filtering
const filteredEvents = allEvents.filter(event => {
  // Apply your filters here
  return event.status === EventStatus.DRAFT && event.category === 'Technology';
});

console.log(filteredEvents); // Filtered array of EventResponse
```

### 2. Create Event
```typescript
const newEvent = await eventAPI.createEvent({
  name: 'Tech Conference 2024',
  description: 'Annual technology conference',
  category: 'Technology',
  bannerImageUrl: 'https://example.com/banner.jpg', // Optional
  venueId: 1,
  bookingStartDate: '2024-01-01T00:00:00Z',
  bookingEndDate: '2024-01-31T23:59:59Z',
  userId: 'speaker-user-id' // Current user's ID
});

console.log(newEvent.data); // EventResponse (status: DRAFT)
```

### 3. Update Event
```typescript
const updatedEvent = await eventAPI.updateEvent('event-id-123', {
  name: 'Updated Tech Conference 2024',
  description: 'Updated description',
  category: 'Technology',
  venueId: 2
});

console.log(updatedEvent.data); // EventResponse
```

### 4. Submit Event for Approval
```typescript
const submittedEvent = await eventAPI.submitEvent('event-id-123');
console.log(submittedEvent.data.status); // EventStatus.PENDING_APPROVAL
```

### 5. Delete Event
```typescript
const result = await eventAPI.deleteEvent('event-id-123');
console.log(result.message); // 'Event deleted successfully'
```

### 6. Get My Event by ID
```typescript
const response = await eventAPI.getMyEventById('event-id-123');
console.log(response.data); // EventResponse
```

## Admin Endpoints (ADMIN Role Required)

### 1. Get All Events (Admin)
```typescript
// Get all events with admin privileges
const response = await eventAPI.getAllEvents();

// Get events with filters
const response = await eventAPI.getAllEvents({
  status: EventStatus.PENDING_APPROVAL,
  speakerId: 'speaker-id-123',
  category: 'Technology',
  page: 1,
  limit: 10
});

console.log(response.data.events); // Array of EventResponse
```

### 2. Get Event by ID (Admin)
```typescript
const response = await eventAPI.getEventById('event-id-123');
console.log(response.data); // EventResponse (any status)
```

### 3. Approve Event
```typescript
const approvedEvent = await eventAPI.approveEvent('event-id-123');
console.log(approvedEvent.data.status); // EventStatus.PUBLISHED
```

### 4. Reject Event
```typescript
const rejectedEvent = await eventAPI.rejectEvent('event-id-123', {
  rejectionReason: 'Event description needs more details and venue capacity is insufficient'
});

console.log(rejectedEvent.data.status); // EventStatus.REJECTED
console.log(rejectedEvent.data.rejectionReason); // Rejection reason
```

### 5. Cancel Event
```typescript
const cancelledEvent = await eventAPI.cancelEvent('event-id-123');
console.log(cancelledEvent.data.status); // EventStatus.CANCELLED
```

### 6. Create Venue
```typescript
const newVenue = await eventAPI.createVenue({
  name: 'Grand Conference Hall',
  address: '123 Main St, City, State',
  capacity: 500,
  openingTime: '08:00',
  closingTime: '22:00'
});

console.log(newVenue.data); // VenueResponse
```

### 7. Update Venue
```typescript
const updatedVenue = await eventAPI.updateVenue(1, {
  name: 'Updated Conference Hall',
  capacity: 600,
  openingTime: '07:00'
});

console.log(updatedVenue.data); // VenueResponse
```

### 8. Delete Venue
```typescript
const result = await eventAPI.deleteVenue(1);
console.log(result.message); // 'Venue deleted successfully'
```

### 9. Get Admin Venues
```typescript
// Get all venues with admin privileges
const response = await eventAPI.getAdminVenues();

// Get venues with filters
const response = await eventAPI.getAdminVenues({
  name: 'Conference',
  capacity: 100,
  page: 1,
  limit: 10
});

console.log(response.data.venues); // Array of VenueResponse
```

### 10. Get Venue by ID (Admin)
```typescript
const response = await eventAPI.getVenueById(1);
console.log(response.data); // VenueResponse
```

## Error Handling

```typescript
try {
  const response = await eventAPI.createEvent(eventData);
  console.log('Event created:', response.data);
} catch (error) {
  if (error.message.includes('Authentication required')) {
    // Handle authentication error
    console.error('Please login first');
  } else if (error.message.includes('Access denied')) {
    // Handle authorization error
    console.error('Insufficient permissions');
  } else {
    // Handle other errors
    console.error('Error creating event:', error.message);
  }
}
```

## Type Definitions

### EventStatus Enum
```typescript
enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}
```

### EventResponse Interface
```typescript
interface EventResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  bannerImageUrl?: string;
  status: EventStatus;
  rejectionReason?: string;
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
```

### VenueResponse Interface
```typescript
interface VenueResponse {
  id: number;
  name: string;
  address: string;
  capacity: number;
  openingTime: string;
  closingTime: string;
  createdAt: string;
  updatedAt: string;
}
```

## Common Use Cases

### 1. Event Creation Flow (Speaker)
```typescript
// 1. Get available venues
const venuesResponse = await eventAPI.getAllVenues();
const venues = venuesResponse.data;

// 2. Create event
const eventResponse = await eventAPI.createEvent({
  name: 'My Event',
  description: 'Event description',
  category: 'Technology',
  venueId: venues[0].id,
  bookingStartDate: '2024-01-01T00:00:00Z',
  bookingEndDate: '2024-01-31T23:59:59Z',
  userId: currentUser.id
});

// 3. Submit for approval
const submittedEvent = await eventAPI.submitEvent(eventResponse.data.id);
```

### 2. Get Speaker Events with Client-Side Filtering
```typescript
// 1. Get all events for the speaker
const response = await eventAPI.getMyEvents(currentUser.id);
const allEvents = response.data.events;

// 2. Apply client-side filters
const draftEvents = allEvents.filter(event => event.status === EventStatus.DRAFT);
const techEvents = allEvents.filter(event => event.category === 'Technology');
const recentEvents = allEvents.filter(event =>
  new Date(event.createdAt) > new Date('2024-01-01')
);

// 3. Combine filters
const filteredEvents = allEvents.filter(event =>
  event.status === EventStatus.DRAFT &&
  event.category === 'Technology' &&
  new Date(event.createdAt) > new Date('2024-01-01')
);
```

### 3. Event Approval Flow (Admin)
```typescript
// 1. Get pending events
const pendingEvents = await eventAPI.getAllEvents({
  status: EventStatus.PENDING_APPROVAL
});

// 2. Review event details
const eventDetails = await eventAPI.getEventById(pendingEvents.data.events[0].id);

// 3. Approve or reject
if (shouldApprove) {
  await eventAPI.approveEvent(eventDetails.data.id);
} else {
  await eventAPI.rejectEvent(eventDetails.data.id, {
    rejectionReason: 'Detailed rejection reason here'
  });
}
```

### 4. Public Event Discovery
```typescript
// 1. Get published events with filters
const events = await eventAPI.getPublishedEvents({
  category: 'Technology',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// 2. Display events to users
events.data.events.forEach(event => {
  console.log(`${event.name} at ${event.venue.name}`);
});
```
