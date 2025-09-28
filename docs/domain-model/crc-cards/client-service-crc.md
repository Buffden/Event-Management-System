# Client (Next.js) – UI CRC Cards

> Next.js front-end microservice. Focus on UI responsibilities, collaborators (APIs), and guards.  
> Uses JWT from Auth; calls each backend via gateway.

## UI Shell & Routing
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **AppShell / Layout** | Global layout, nav, theming, error boundary. | AuthGuard, ApiClient |
| **AuthGuard** | Protect routes; redirect unauthenticated/unauthorized users. | Auth Service API (token verify), Router |
| **RoleGuard** | Enforce role-based access (Admin/Speaker/Attendee). | JWT claims, Router |

## Feature UIs – Auth
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **LoginPage** | Login form, call `/auth/login`, store tokens. | Auth API, SessionStore |
| **RegisterPage** | Registration form, call `/auth/register`. | Auth API, SessionStore |
| **ProfilePage** | View/update profile. | **User Service API** |

## Feature UIs – Events
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **EventsListPage** | List events with filters/search. | Event Service API |
| **EventDetailPage** | Event details + sessions. | Event Service API |
| **AdminEventForm** | Create/edit event (admin). | Event Service API |

## Feature UIs – Registration & Tickets
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **RegisterButton** | POST registration; show confirmed/waitlist. | Registration Service API |
| **MyRegistrationsPage** | Show user's registrations; cancel. | Registration Service API |
| **MyTicketsPage** | Show QR codes; status. | Ticketing Service API |
| **TicketScanner** | Access camera; scan QR; call validate API; show result. | Ticketing Service API, Media APIs |

## Feature UIs – Speakers & Schedule
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **SpeakerProfilePage** | View/update speaker bio; upload slides. | Speaker Service API, Storage upload |
| **ScheduleBoard (Admin)** | Create/adjust sessions; visualize conflicts. | Event Service API (sessions), ScheduleConflict badge (client-side hint) |

## Feature UIs – Notifications & Feedback
| Component / Module | Responsibilities | Collaborators |
|--------------------|------------------|---------------|
| **AnnouncementsPanel (Admin)** | Send announcement NOW / schedule reminders. | Notification Service API |
| **FeedbackForm** | Submit rating/comment for event/session. | Feedback Service API |
| **FeedbackSummary (Admin)** | View aggregated results. | Feedback Service API |

## Cross-Cutting UI Modules
| Module | Responsibilities | Collaborators |
|--------|------------------|---------------|
| **ApiClient** | HTTP client; attaches JWT; retries on 401 with refresh. | Auth Service API, Gateway |
| **SessionStore** | Keep tokens, user, roles in memory/storage; logout. | Auth Service API |
| **UiStateStore** | Local state for lists/forms/modals; optimistic updates. | Feature components |
| **ErrorBoundary / Toaster** | Catch/report errors; user notifications. | — |

## Notes
- **UI doesn't hold business rules**; it reflects server responses.  
- Validation: client-side UX checks (required fields) + always rely on server validation.  
- Accessibility (a11y): forms, buttons, scanner flow (fallback to manual code).
