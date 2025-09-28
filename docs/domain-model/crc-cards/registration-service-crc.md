# Registration Service – CRC Cards

> Owns event registrations and waitlist/confirm/cancel flows.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **Registration** | Manage status: Confirmed/Waitlisted/Cancelled; single active per (user,event). | Event API, RegistrationRepository |
| **CapacitySnapshot** (VO) | Derived capacity view (optional). | Event API |

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **RegistrationService** | Register/cancel/promote waitlist. | RegistrationRepository, Event API, Ticketing API (or event bus) |
| **CapacityAvailable (Spec)** | Check remaining capacity. | Event API |
| **SingleActiveRegistration (Spec)** | Enforce one active registration. | RegistrationRepository |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **RegisterForEventHandler** | Create Registration; confirm or waitlist. | RegistrationService |
| **CancelRegistrationHandler** | Cancel and free capacity if needed. | RegistrationService |
| **PromoteFromWaitlistHandler** | Promote when capacity opens. | RegistrationService |

## Cross-Service Collaboration
- **Sync orchestration (MVP)**: on Confirmed → call **Ticketing Service API** to issue ticket.  
  *(Alternative)* **Async choreography**: emit `RegistrationConfirmed` → ticketing subscribes.

## Infrastructure
- **Repositories**: RegistrationRepository  
- **Outbound**: **Event Service API**, **Ticketing Service API** (or message bus)
