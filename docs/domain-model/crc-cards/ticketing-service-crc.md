# Ticketing Service – CRC Cards

> Owns tickets and attendance scanning. Idempotent validation.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **Ticket** | Admission token (qrCode, status, issuedAt, scannedAt). First valid scan flips to Scanned. | Registration API |
| **Attendance** | Record scan (who, method, when); event-level and optional session-level. | Ticket |

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **TicketIssuanceService** | Issue ticket when registration confirmed. | TicketRepository |
| **TicketValidator** | Validate QR, mark scanned, create attendance; idempotent. | TicketRepository, AttendanceRepository, QrCodeAdapter |
| **TicketNotPreviouslyScanned (Spec)** | Prevent double-admission. | Ticket |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **IssueTicketHandler** | Create ticket for registration. | TicketIssuanceService |
| **ValidateTicketHandler** | Validate and store attendance. | TicketValidator |

## Cross-Service Collaboration
- **Inbound**: Registration Service API (or event) to issue ticket.  
- **Optional**: Event Service API to confirm event/session IDs exist.

## Infrastructure
- **Repositories**: TicketRepository, AttendanceRepository  
- **Adapters**: QrCodeAdapter, Clock, IdGenerator
