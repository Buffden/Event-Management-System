# Reporting & Analytics Service – CRC Cards

> Read-optimized projections for admin dashboards (registrations over time, attendance, NPS).

## Read Models (Projections)
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **RegistrationStats** | Registrations over time; by event. | Registration Service API |
| **AttendanceStats** | Show-ups vs issued tickets. | Ticketing Service API |
| **FeedbackStats** | Ratings distribution; NPS. | Feedback Service API |

## Application (Queries)
| Query | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **GetDashboardMetrics** | Compose multiple projections for admin UI. | *Stats models above* |

## Data Ingestion Options
- **Sync** (MVP): Pull on demand from service APIs.  
- **Async** (stretch): Subscribe to events to update local projections.

## Infrastructure
- **Storage**: Read DB or materialized views (optional)  
- **Outbound**: Registration/Ticketing/Feedback Service APIs
