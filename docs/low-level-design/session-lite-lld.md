## Session Lite Low-Level Design

### 1. Goal
Provide a minimal, production-ready way to represent multiple sessions per event, assign speakers with availability checks, and expose schedule + materials status across admin, speaker, and attendee views without overhauling existing services.

### 2. Data Model Changes
- `Session` (new table)
  - `id` (UUID)
  - `event_id` (FK → `Event`)
  - `title`
  - `description` (optional)
  - `starts_at`, `ends_at`
  - `stage_location` (optional)
  - `created_at`, `updated_at`
  - Index on (`event_id`, `starts_at`)
- `SessionSpeaker` (join table)
  - `id` (UUID)
  - `session_id` (FK → `Session`)
  - `speaker_id` (FK → `Speaker`)
  - `materials_asset_id` (optional FK → global `SpeakerMaterial`)
  - `materials_status` (enum: `requested`, `uploaded`, `acknowledged`; defaults to `requested`)
  - `speaker_checkin_confirmed` (boolean; required before “Join Event” unlocks)
  - `created_at`, `updated_at`
  - Unique index on (`session_id`, `speaker_id`)
- `SpeakerMaterial` (existing/global)
  - Reuse current storage; session assignments only keep references so deleting sessions never removes shared speaker assets.

### 3. Core Service Logic
- **Create/Update session**
  - Accepts session metadata and retains event-level validation (timeframe within event dates).
  - Enforces non-overlapping sessions per stage when configured.
- **Assign speaker to session**
  - Validates that the speaker has no accepted sessions overlapping `starts_at`/`ends_at`.
  - Stores material requirements and initializes `materials_status = requested`.
- **Material upload flow**
  - Speakers upload files via existing storage; API stores `materials_asset_id`, flips status to `uploaded`.
  - Speakers must mark `speaker_checkin_confirmed = true` before the join button enables.
- **Delete session**
  - Removes session + assignments in a transaction; materials remain intact in the global library.

### 4. API Touchpoints
- `GET /events/:id`
  - Returns `sessions` array with nested `speakers` (name, session assignment metadata, materials status, check-in flag).
- `POST /events/:id/sessions`
  - Creates session and (optionally) accepts a `speakers` array with availability validation.
- `PUT /sessions/:id`
  - Updates session details; warns if schedule changes impact assigned speakers.
- `POST /sessions/:id/speakers`
  - Adds speaker assignment after availability check; returns conflict info if double-booked.
- `PATCH /sessions/:id/speakers/:speakerId/materials`
  - Updates materials status/check-in flags for that assignment.
- `POST /sessions/:id/speakers/:speakerId/materials/upload`
  - Handles file upload and links to global materials.
- `DELETE /sessions/:id`
  - Removes session and assignments.

### 5. Client Updates
- **Admin dashboard**
  - Session list for an event with inline forms (title, time, location).
  - Speaker picker with conflict warnings; materials status shown per speaker.
  - Timing edits display admin-only warnings; no automatic speaker notifications.
- **Speaker dashboard**
  - Shows upcoming sessions with timeframe, materials checklist, upload controls, and join button gated by `speaker_checkin_confirmed`.
- **Attendee views**
  - Event cards and details display session title, start/end time, and speaker names.

### 6. Validation & Constraints
- Sessions must fall within the parent event timeframe.
- Speakers cannot be assigned to overlapping sessions; admins can override with explicit confirmation.
- `materials_status = uploaded` and `speaker_checkin_confirmed = true` required before speaker join.

### 7. Testing
- Unit tests for session creation, assignment availability checks, and materials state transitions.
- Integration tests covering event session CRUD with nested speaker payloads.
- UI tests verifying admin conflict warnings, speaker upload workflow, and attendee session rendering.


