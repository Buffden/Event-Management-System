# Speaker Service – CRC Cards

> Owns speaker profiles and slide uploads.

## Domain Entities
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **SpeakerProfile** | Bio, links, slidesUrl; owned by a User. | User API |

## Domain Services
| Class | Responsibilities | Collaborators |
|------|-------------------|---------------|
| **SpeakerService** | Manage profile and uploads (set slidesUrl). | SpeakerProfileRepository, StorageAdapter |

## Application (Use-Cases)
| Handler | Responsibilities | Collaborators |
|--------|-------------------|---------------|
| **UpsertProfileHandler** | Create/update profile. | SpeakerService |
| **UploadSlidesHandler** | Upload slides and update profile. | SpeakerService |

## Cross-Service Collaboration
- **Outbound**: **Event Service API** (optional: to validate speaker IDs used in sessions).

## Infrastructure
- **Repository**: SpeakerProfileRepository  
- **Adapters**: StorageAdapter (S3/local), User API client
