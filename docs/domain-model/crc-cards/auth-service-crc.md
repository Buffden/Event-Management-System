# Auth Service – CRC Cards

> Owns authentication & sessions. Issues/validates JWT. No PII beyond auth essentials.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **User** | Identify actors; store `email`, `passwordHash`, `role`. | — |
| **AuthSession** | Persist refresh session (token, expiry, ua, ip); rotate/revoke. | User |

## Domain Services & Policies
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **AuthService** | Register, login, logout, refresh, `me`. Issue JWT with claims. | UserRepository, AuthSessionRepository, PasswordHasher, JwtSigner, Clock |
| **PasswordPolicy (Spec)** | Enforce password strength (if required). | — |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **RegisterHandler** | Create user, start session, return tokens. | AuthService |
| **LoginHandler** | Verify credentials, rotate session, return tokens. | AuthService |
| **RefreshHandler** | Validate refresh, issue new tokens, rotate. | AuthService |
| **LogoutHandler** | Revoke session. | AuthService |

## Infrastructure (Repositories & Adapters)
- **Repositories**: UserRepository, AuthSessionRepository  
- **Adapters**: PasswordHasher, JwtSigner, JwtVerifier, Clock
