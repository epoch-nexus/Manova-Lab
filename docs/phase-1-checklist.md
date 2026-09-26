# Manova Labs — Phase 1 Architecture & Contract Checklist

This document tracks all deliverables and architectural requirements for Phase 1 (Experiment Schema & API Contract).

---

### Deliverables Checklist

- [x] **Repository / Project Initialized**: Git repository initialized cleanly; directory structure established.
- [x] **Folder Structure Created**: `docs/`, `docs/examples/`, `src/domain/`, `src/schemas/`, `src/engine/`, `src/types/`, and `tests/` created.
- [x] **Empty Folders Guarded**: `.gitkeep` placeholders added to `src/domain/`, `src/schemas/`, `src/engine/`, and `tests/`.
- [x] **TypeScript Configured**: Strict `tsconfig.json` configured (`strict: true`, `NodeNext` modules, declarations enabled).
- [x] **Phase 1 Dependencies Installed**: Strictly minimal dev-only dependencies (`typescript`, `@types/node`). No forbidden runtime frameworks.
- [x] **README Created**: Overview of Manova Labs, team roles (Atharva - backend/architecture, Harikrishna - frontend/UX), Bit & Build hackathon context, and current phase status.
- [x] **Glossary Created (`docs/glossary.md`)**: Canonical definitions for Experiment, Trial, Stimulus, Expected Response, Participant Response, Session, Participant, Researcher, Execution Engine, Timing Engine, Randomization, Conditional Branching, Publishing/Draft/Published.
- [x] **Core Schemas Defined (`docs/architecture.md`)**: Complete specifications for Experiment, Trial, Stimulus, Expected Response, Participant Response, and Session with types, lifecycle, relationships, and categories (EXPERIMENT CONFIGURATION vs RUNTIME / SESSION DATA vs RESULT DATA).
- [x] **TypeScript Type Definitions (`src/types/experiment.d.ts`)**: Type-only definitions with zero runtime logic, classes, or framework imports. Passes strict compilation.
- [x] **JSON Examples Created**: Standalone, valid, parseable JSON files in `docs/examples/`:
  - [x] `stimulus.example.json`
  - [x] `expected-response.example.json`
  - [x] `trial.example.json`
  - [x] `experiment.example.json`
  - [x] `participant-response.example.json`
  - [x] `session.example.json`
  - [x] `mvp-reaction-time-experiment.example.json`
- [x] **MVP Reaction-Time Experiment Represented**: Full 3-trial visual RT task (Instruction → Fixation → Stimulus → Keypress → Record Response → Next Trial → Complete) modeled without hardcoding.
- [x] **Stimulus Representation Designed**: Discriminated union (`type: "text" | "image"`) extensible to audio/video.
- [x] **Response Representation Designed**: Strict separation between `ExpectedResponse` configuration and `ParticipantResponse` runtime measurement.
- [x] **Timing Configuration & Telemetry Defined**: Configured durations separated from high-resolution measured latency and hardware precision telemetry (`requestAnimationFrame`, refresh rate, visibility state).
- [x] **Trial Progression & Branching Seam Defined**: Explicit `nextTrialId` pointers with a reserved `branching` conditional rule block.
- [x] **Execution Concepts Documented**: Finite conceptual states mapped directly to schema fields (`instruction` → `trial` → `stimulus` → `awaiting-response` → `response-recorded` → `next-trial` → `complete`).
- [x] **Experiment Lifecycle Defined**: State machine (`DRAFT` vs `PUBLISHED`), atomic publish validation, and rejection of invalid configurations.
- [x] **ID Strategy Specified**: UUIDv4 for database entities and human-readable slugs for public experiment links. Server vs. client generation justified.
- [x] **Versioning & Snapshotting Strategy Documented**: Participant sessions locked to immutable published snapshots to isolate them from concurrent researcher edits.
- [x] **REST API Contract Defined (`docs/api.md`)**:
  - [x] Researcher Endpoints (`POST /experiments`, `GET /experiments`, `GET /experiments/:id`, `PUT /experiments/:id`, `DELETE /experiments/:id`, `POST /experiments/:id/publish`).
  - [x] Participant Endpoints (`POST /participant/experiments/:publicSlug/sessions`, `POST /participant/sessions/:sessionId/trials/:trialId/response`, `POST /participant/sessions/:sessionId/abandon`).
  - [x] Security and boundary separation (authenticated researcher vs. anonymous participant).
  - [x] Dedicated completion endpoint evaluated and justified (deterministic auto-completion on final trial response).
- [x] **API Error Contract Standardized**: Unified error schema (`error.code`, `error.message`, `error.details`) and standard HTTP status code mapping.
- [x] **Validation Rules Documented**: Structural, relational, and temporal rules specified for Phase 2 implementation.
- [x] **Architecture Decisions Documented**: All 14 mandated topics formatted with `Decision:`, `Reason:`, and `Future extension:`.
- [x] **Phase 2 Compatibility Self-Check Completed**: All contracts and interfaces verified to enable immediate Phase 2 implementation without redesign.

---

### Final Verification Status

**Phase 1 Status: COMPLETE**
