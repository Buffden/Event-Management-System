# EMS – CRC Cards (Master Index)

This index links to CRC cards per microservice. Each CRC lists **Class**, **Responsibilities**, and **Collaborators**.  
Cross-service collaborators are named by **Service API** (not by foreign entities) to keep services decoupled.

## Services
- [Auth Service](./auth-service-crc.md)
- [User Service](./user-service-crc.md)
- [Event Service](./event-service-crc.md)
- [Registration Service](./registration-service-crc.md)
- [Ticketing Service](./ticketing-service-crc.md)
- [Speaker Service](./speaker-service-crc.md)
- [Feedback Service](./feedback-service-crc.md)
- [Notification Service](./notification-service-crc.md)
- [Reporting & Analytics Service](./reporting-analytics-service-crc.md)
- [Client Service (Next.js)](./client-service-crc.md)

## Notes
- Each service **owns its database**; cross-service references are **IDs only**.
- Use **DTOs** at boundaries; do not pass domain objects across services.
- Favor **idempotent** operations and eventual consistency for cross-service flows.