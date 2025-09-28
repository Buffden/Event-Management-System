# Notification Service – CRC Cards

> Sends reminders/alerts via email (or in-app). Decoupled via events or API calls.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **Notification** | Type, payload, schedule, status; deliver to user. | User API |

## Domain Services & Patterns
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **NotificationComposer** | Render templates with payload. | TemplateRepository |
| **NotificationSender** | Send immediately or schedule; update status. | MailAdapter, Clock |
| **Observer/Subscriber** | React to domain events (e.g., RegistrationConfirmed). | Event Bus (optional) |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **SendNowHandler** | Compose and send message. | NotificationSender |
| **ScheduleReminderHandler** | Schedule send for later. | NotificationSender |

## Cross-Service Collaboration
- **Inbound**: Registration/Ticketing events (if async) or direct API calls (sync).
- **Outbound**: Email provider via MailAdapter.

## Infrastructure
- **Repositories**: TemplateRepository, NotificationRepository  
- **Adapters**: MailAdapter (SMTP/provider), Clock
