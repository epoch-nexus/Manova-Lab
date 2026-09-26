# Manova Labs — Phase-by-Phase Development Workflow & Roadmap

This document serves as the master tracking file for the Manova Labs backend, core logic, and engine roadmap. It documents all completed changes per phase, outlines future phase scopes, and enforces the mandatory pre-implementation review protocol between Atharva and Harikrishna.

---

## 1. Master Phase Tracker

| Phase | Title | Focus Area | Status | Verification Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Experiment Schema & API Contract** | Data contracts, schemas, TypeScript types, examples, architecture | **COMPLETED** | Verified & committed to `origin/main` |
| **Phase 2** | **Runtime Validation & Database Persistence** | Zod schemas, PostgreSQL + Prisma, REST API server implementation | **COMPLETED** | Verified (15 tests passing, migrations, live smoke tests) |
| **Phase 3** | **Execution Engine & State Machine** | Client-side runner, state transitions, trial flow coordinator | **PLANNED** | Pre-implementation plan required |
| **Phase 4** | **High-Precision Timing Engine** | `requestAnimationFrame`, sub-frame telemetry, jitter compensation | **PLANNED** | Pre-implementation plan required |
| **Phase 5** | **Results Aggregation & Analytics** | Researcher results queries, CSV/JSON export, latency summaries | **PLANNED** | Pre-implementation plan required |
| **Phase 6** | **Randomization Engine** | Trial shuffling, block counterbalancing, Latin-square balancing | **PLANNED** | Pre-implementation plan required |
| **Phase 7** | **Conditional Branching Engine** | Dynamic routing rules, performance-dependent trial jumping | **PLANNED** | Pre-implementation plan required |
| **Phase 8** | **Authentication & Production Hardening** | JWT/Auth, IRB compliance, rate limiting, deployment | **PLANNED** | Pre-implementation plan required |

---

## 2. Mandatory Phase Execution Protocol

To maintain complete architectural integrity, avoid uncoordinated dependencies, and keep Atharva in full control of design decisions:

1. **Plan Proposal**: Prior to touching any code or installing dependencies for a new phase, an **Implementation Plan** must be presented.
2. **Review & Alignment**: Atharva reviews the plan, technology choices, database structure, and integration boundaries.
3. **Explicit Verification**: Atharva explicitly approves the plan or requests modifications.
4. **Execution**: Only after explicit approval does implementation proceed.
5. **Phase Review & Commit**: Guardrails are checked, checklist updated, and changes logged into this workflow file.

---

## 3. Phase 1 — Experiment Schema & API Contract (COMPLETED)

### Objectives Achieved
* Established unambiguous, strongly typed data contracts across the platform without jumping ahead into premature server logic.
* Strictly isolated **Experiment Configuration** (design-time), **Runtime / Session Data** (in-flight state), and **Result Data** (empirical telemetry).
* Separated **Configured Timing** (intended parameters) from **Measured Timing** (browser telemetry).
* Built a pointer-based progression model (`nextTrialId`) with a reserved `branching` rule seam for Phase 7.
* Defined the REST API contract for both authenticated Researcher operations and anonymous Participant sessions.

### Deliverables & Changes Created
* **Repository Baseline**:
  * `package.json`: Configured with minimal dev-only dependencies (`typescript`, `@types/node`).
  * `tsconfig.json`: Strict baseline (`ES2022`, `NodeNext`, `strict: true`, declarations enabled).
  * `.gitignore`: Excludes `node_modules/`, `dist/`, `.env*`, and editor cruft.
  * `README.md`: Project summary, team roles, and hackathon scope.
* **Core Documentation**:
  * [`docs/glossary.md`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/glossary.md): Official canonical vocabulary for Atharva and Harikrishna.
  * [`docs/architecture.md`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/architecture.md): Conceptual model, timing contracts, execution states, snapshotting strategy, and 14 Architecture Decisions.
  * [`docs/api.md`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/api.md): Full REST specification for Researcher and Participant endpoints, validation rules, and unified error handling.
  * [`docs/phase-1-checklist.md`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/phase-1-checklist.md): Comprehensive 21-item verification checklist.
* **Standalone JSON Examples**:
  * [`docs/examples/stimulus.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/stimulus.example.json)
  * [`docs/examples/expected-response.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/expected-response.example.json)
  * [`docs/examples/trial.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/trial.example.json)
  * [`docs/examples/experiment.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/experiment.example.json)
  * [`docs/examples/participant-response.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/participant-response.example.json)
  * [`docs/examples/session.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/session.example.json)
  * [`docs/examples/mvp-reaction-time-experiment.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/mvp-reaction-time-experiment.example.json)
* **TypeScript Contracts**:
  * [`src/types/experiment.d.ts`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/src/types/experiment.d.ts): Pure type-only interfaces and DTOs with zero runtime logic. Passes `tsc --noEmit`.
* **Reserved Scaffolding**:
  * `src/domain/.gitkeep`, `src/schemas/.gitkeep`, `src/engine/.gitkeep`, `tests/.gitkeep`.
* **Git Status**:
  * Initial commit `4fcb215` pushed to `origin/main`.

---

## 4. Phase 2 — Runtime Validation & Database Persistence (COMPLETED)

### Objectives Achieved
* Built concrete PostgreSQL persistence using Prisma 5.22, with automated migrations and JSONB storage for flexible trial/stimulus configurations.
* Implemented strict runtime validation via Zod 3.23 in `src/schemas/`, enforcing trial uniqueness, non-empty trials, pointer integrity, and acyclic terminal paths.
* Implemented the Researcher Experiment REST API endpoints (`/api/v1/experiments` and `/experiments`) using Express 5, matching `docs/api.md` byte-for-byte.
* Created centralized error handling returning uniform `{ error: { code, message, details } }` envelopes across all status codes (400, 404, 409, 422, 500).
* Implemented the immutable version snapshot generator on `POST /experiments/:id/publish`, freezing study definitions into the `experiment_versions` table.
* Developed an automated test suite (15/15 tests passing) and a live HTTP smoke test script (9/9 requests passing).

### Deliverables & Changes Created
* **Database & Persistence**:
  * `prisma/schema.prisma`: Models for `Experiment`, `Trial`, `Stimulus`, `ExpectedResponse`, `ExperimentVersion`. Zero participant/session tables.
  * `prisma/migrations/20260926055133_init_experiment_persistence/migration.sql`: Initial PostgreSQL schema migration.
  * `src/db/prisma.ts`: PrismaClient singleton.
* **Validation Schemas (`src/schemas/`)**:
  * `src/schemas/stimulus.schema.ts`: Text & image discriminated union schemas.
  * `src/schemas/trial.schema.ts`: Fixation, timingConfig, expectedResponse schemas.
  * `src/schemas/experiment.schema.ts`: Experiment CRUD & publishing graph validation.
  * `src/schemas/index.ts`: Unified export barrel.
* **Domain & Services**:
  * `src/domain/experiment.service.ts`: CRUD, trial mapping, publishing validation, and snapshot generator.
* **HTTP Server & Routing**:
  * `src/server/errors.ts`: Domain error classes (`NotFoundError`, `BadRequestError`, `ValidationError`, `ConflictError`).
  * `src/server/middleware/errorHandler.ts`: Centralized error middleware.
  * `src/server/routes/experiment.routes.ts`: Express router for Researcher API.
  * `src/server/app.ts`: Application factory with CORS, JSON parsing, healthcheck, and routes.
  * `src/index.ts`: Development server entrypoint.
* **Testing & Scripts**:
  * `jest.config.cjs`: ESM Jest configuration for TypeScript.
  * `tests/experiments.test.ts`: Integration test suite (15 test cases).
  * `scripts/smoke-test.ts`: Live HTTP smoke test script (9 test cases).
  * `docs/phase-2-checklist.md`: Phase 2 verification checklist.
* **Git Status**:
  * Implemented on branch `backend/api`.

---

## 5. Upcoming Phases Roadmap

### Phase 3: Execution Engine & State Machine
* **Goal**: Client-side execution coordinator that steps through the experimental protocol.
* **Key Deliverables**:
  1. Finite state machine (`instruction` → `trial` → `stimulus` → `awaiting-response` → `response-recorded` → `next-trial` → `complete`).
  2. Event-driven interface for Harikrishna's frontend player to mount stimuli, trigger visual transitions, and display fixation crosses.
  3. Automatic transition upon final trial completion.

### Phase 4: High-Precision Timing Engine
* **Goal**: Web-optimized timing subsystem for millisecond-accurate stimulus presentation and response capture.
* **Key Deliverables**:
  1. Double-buffered `requestAnimationFrame` render alignment.
  2. High-resolution input event timestamp synchronization (`performance.now()`).
  3. Telemetry capture: refresh rate estimation, hidden tab detection, and timing method tracking.

### Phase 5: Results Aggregation & Analytics
* **Goal**: Enable researchers to inspect, filter, and export participant performance datasets.
* **Key Deliverables**:
  1. Summary endpoints (mean RT, error rates, condition comparisons).
  2. Raw data export in standardized CSV and JSON formats for external statistical packages (R, Python/Pandas, SPSS).

### Phase 6: Stimulus & Trial Randomization Engine
* **Goal**: Algorithmic trial order shuffling and condition counterbalancing.
* **Key Deliverables**:
  1. Block randomization algorithms (Fisher-Yates shuffle with seed support for reproducibility).
  2. Balanced Latin-square condition assignments across participant sessions.

### Phase 7: Dynamic Conditional Branching Engine
* **Goal**: Performance-contingent trial routing.
* **Key Deliverables**:
  1. Rule evaluation engine processing `trial.branching.conditions`.
  2. Support for accuracy branches (e.g., repeating practice on error) and latency branches (e.g., speed-up warnings).

### Phase 8: Authentication & Production Hardening
* **Goal**: Production-ready security, researcher accounts, and IRB/GDPR compliance.
* **Key Deliverables**:
  1. JWT-based researcher authentication and RBAC.
  2. Rate limiting, CORS policies, and participant anonymity audits.
  3. Containerization (Dockerfile) and deployment configuration.
