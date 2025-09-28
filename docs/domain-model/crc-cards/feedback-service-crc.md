# Feedback Service – CRC Cards

> Collects attendee feedback for events/sessions.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **Feedback** | One rating/comment per user per target (event/session). | User API, Event API |

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **FeedbackService** | Submit feedback; aggregate summaries. | FeedbackRepository |
| **OnePerUserPerTarget (Spec)** | Prevent duplicates (per config). | FeedbackRepository |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **SubmitFeedbackHandler** | Create feedback entry. | FeedbackService |
| **GetFeedbackSummaryHandler** | Aggregate stats for admin. | FeedbackService |

## Cross-Service Collaboration
- **Outbound**: **Event Service API** (validate target IDs).

## Infrastructure
- **Repository**: FeedbackRepository
