# Session Lite Rollout Plan

Reference roadmap for implementing the session-lite LLD incrementally and validating each step from the client side.

## Phase 0 – Schema & Contracts
- Align Prisma schema/data model with `session-lite-lld.md`.
- Add missing identifiers (`sessionLiteId`, `eventId`, `speakerId`, `invitationId`, etc.).
- Update DTOs/response contracts so clients receive every identifier needed for UI logic and conditionals.

## Phase 1 – Session Lite CRUD APIs
- Implement minimal create/read/update/delete flows on the backend.
- Ensure responses include full identifier sets for downstream consumers.
- Cover the new service endpoints with integration tests.
- Manually hit the APIs from the client (or temporary tooling) to confirm payloads.

## Phase 2 – Admin UI Integration
- Wire the new APIs into the admin dashboard (feature flag if necessary).
- Reflect IDs in the UI components (rows, actions, statuses).
- Add loading/error states and verify the payload contracts against the UI bindings.

## Phase 3 – Invitation Alignment
- Update invitation flows to reference session-lite IDs directly (no message parsing).
- Surface invite state in the client using the explicit identifiers.
- Remove legacy logic that inferred session links from free-form text.

## Phase 4 – Validation & Logging
- Add guardrails for state transitions (pending/accepted/rejected) keyed by explicit IDs.
- Ensure structured logging and telemetry reference the new identifiers.
- Final regression pass through the client to confirm no contradictions remain between modal and session table states.

