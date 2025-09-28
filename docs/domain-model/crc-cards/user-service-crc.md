# User Service – CRC Cards

> Owns user profile & authorization metadata (non-credential).  
> Source of truth for profile fields; coordinates role assignments used by Auth claims.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **UserProfile** | Store profile data (name, avatarUrl, phone?); link to `userId`. | Auth Service API (to ensure user exists) |
| **UserRole** | Role assignments for a user (Admin, Speaker, Attendee). | Auth Service API (to refresh tokens with new claims) |

> Credentials (`email`, `passwordHash`) and sessions are **NOT** here—they live in **Auth Service**.

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **UserDirectory** | CRUD profile; list/search users (admin). | UserProfileRepository |
| **RoleManager** | Grant/revoke roles; publish role changes. | UserRoleRepository, Auth Service API |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **UpsertProfileHandler** | Create/update profile for a userId. | UserDirectory |
| **AssignRoleHandler** | Add/remove role from user; notify Auth to update claims. | RoleManager |
| **GetUserSummaryHandler** | Return profile + roles. | UserDirectory, RoleManager |

## Cross-Service Collaboration
- **Inbound**: userId originates from **Auth** (JWT subject).  
- **Outbound**: notify **Auth** to refresh claims (e.g., `POST /auth/claims/refresh` or event) when roles change.

## Infrastructure
- **Repositories**: UserProfileRepository, UserRoleRepository  
- **Outbound**: Auth Service API client
