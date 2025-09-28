# Event Service – CRC Cards

> Owns events and sessions. Source of truth for schedules.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **Event** | Hold title, venue, capacity, `startAt/endAt`, status; ensure `start<end`. | SessionSlotRepository |
| **SessionSlot** | Session in room/time; validate within event window. | Event |
| **SessionSpeaker** (join) | Link SessionSlot ↔ SpeakerProfile (ID only). | SessionSlot |

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **ScheduleConflictService** | Detect overlapping sessions per room/time. | SessionSlotRepository |
| **NoOverlapInRoom (Spec)** | Guard against overlap. | SessionSlot |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **CreateEventHandler** | Create event aggregate. | EventRepository |
| **UpdateEventHandler** | Edit details/status. | EventRepository |
| **CreateSessionSlotHandler** | Add session to event. | EventRepository, SessionSlotRepository |
| **AssignSpeakersHandler** | Manage SessionSpeaker links. | SessionSpeakerRepository |

## Infrastructure
- **Repositories**: EventRepository, SessionSlotRepository, SessionSpeakerRepository  
- **Outbound Collaborators**: **Speaker Service API** (resolve speaker IDs for validation – optional)
