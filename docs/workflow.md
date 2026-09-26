# Manova Labs — Phase-by-Phase Development Workflow & Roadmap

This document serves as the master tracking file for the Manova Labs backend, core logic, and engine roadmap. It documents all completed changes per phase, outlines future phase scopes, and enforces the mandatory pre-implementation review protocol between Atharva and Harikrishna.

---

## 1. Master Phase Tracker

| Phase | Title | Focus Area | Status | Verification Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Experiment Schema & API Contract** | Data contracts, schemas, TypeScript types, examples, architecture | **COMPLETED** | Verified & committed to `origin/main` |
| **Phase 2** | **Runtime Validation & Database Persistence** | Zod schemas, PostgreSQL + Prisma, REST API server implementation | **COMPLETED** | Verified (15 tests passing, migrations, live smoke tests) |
| **Phase 3** | **Execution Engine & State Machine** | Execution state machine, session progression, participant API | **COMPLETED** | Verified (34 tests passing, live smoke tests, snapshot isolation) |
| **Phase 4** | **High-Precision Timing Engine** | `requestAnimationFrame`, sub-frame telemetry, jitter compensation | **COMPLETED** | Verified (42 tests passing, 50-trial verification, browser PoC) |
| **Phase 5** | **Results Aggregation & Analytics** | Researcher results queries, CSV/JSON export, latency summaries | **COMPLETED** | Verified (51 tests passing, live smoke tests, JSON/CSV exports) |
| **Phase 6** | **Randomization Engine** | Seeded Fisher-Yates, deterministic PRNG, session trial order persistence | **COMPLETED** | Verified (66 tests passing, migration, live smoke tests, seed reproducibility) |
| **Phase 7** | **Conditional Branching Engine** | Response-correctness branching, loop protection, snapshot isolation | **COMPLETED** | Verified (80 tests passing, live smoke tests, precedence compatibility) |
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

## 5. Phase 3 — Experiment Execution Engine & State Machine (COMPLETED)

### Objectives Achieved
* Implemented the pure `ExecutionEngine` state machine in `src/engine/` executing published experiments from start to complete.
* Implemented anonymous participant sessions permanently bound to immutable published `ExperimentVersion` snapshots.
* Designed and executed the mandatory Snapshot Immutability test verifying that modifying an experiment to Version 2 never alters an in-flight session's Version 1 definition.
* Built atomic linear progression using `nextTrialId` pointers and enforced response concurrency protection via PostgreSQL transactions.
* Created the Participant API endpoints (`POST .../sessions`, `GET .../sessions/:id`, `POST .../response`, `POST .../abandon`) matching `docs/api.md`.
* Developed a 34-test automated test suite and 12-request live smoke test suite with 100% pass rate.

### Deliverables & Changes Created
* **Database & Persistence**:
  * Added `Session` and `SessionResponse` models to `prisma/schema.prisma`.
  * Applied migration `20260926060339_add_participant_sessions`.
* **Execution Engine (`src/engine/`)**:
  * `src/engine/execution-state.ts`: Execution state types and participant-safe trial projections.
  * `src/engine/execution-engine.ts`: Core state machine, step resolution, and linear advancement.
* **Domain & Validation**:
  * `src/schemas/participant.schema.ts`: Validation schemas for session start and responses.
  * `src/domain/session.service.ts`: Session lifecycle management and transactional persistence.
* **Server Routes**:
  * `src/server/routes/participant.routes.ts`: Participant execution endpoints.
  * Mounted in `src/server/app.ts` under `/api/v1/participant` and `/participant`.
* **Testing & Verification**:
  * `tests/execution-engine.test.ts`: 9 unit tests for the pure state machine.
  * `tests/participant-execution.test.ts`: 10 integration tests against live PostgreSQL.
  * `scripts/smoke-test.ts`: Extended with 12 live end-to-end HTTP smoke tests.
  * `docs/phase-3-checklist.md`: Phase 3 verification checklist.
* **Git Status**:
  * Implemented on branch `backend/experiment-engine`.

---

## 6. Phase 4 — High-Precision Timing Engine (COMPLETED)

### Objectives Achieved
* Implemented the client-side `TimingController` (`src/timing/`) enforcing millisecond-resolution reaction time measurement via `performance.now()`.
* Aligned visual stimulus presentation with the display refresh cycle using `requestAnimationFrame()`, explicitly distinguishing between the JavaScript scheduling point (`STIMULUS_PENDING_PRESENTATION`) and the physical rendering boundary (`STIMULUS_PRESENTED`).
* Implemented the complete Phase 4 timing state model (`IDLE` → `PRE_STIMULUS` → `STIMULUS_PENDING_PRESENTATION` → `STIMULUS_PRESENTED` → `AWAITING_RESPONSE` → `RESPONSE_CAPTURED` → `TIMEOUT` / `COMPLETE`).
* Built guards against anticipatory responses, duplicate keypresses, and late responses arriving after timeout.
* Added environmental telemetry tracking display refresh rates (Hz) and detecting background tab throttling via `document.visibilityState`.
* Developed a responsive standalone browser Proof-of-Concept (`public/timing-poc.html`) runnable independently from the backend.
* Verified the timing engine across a 50-trial automated test run and 8 automated unit tests (42/42 tests passing across all suites).

### Deliverables & Changes Created
* **Timing Engine Module (`src/timing/`)**:
  * `src/timing/timing-types.ts`: Lifecycle state definitions, trial inputs, timing result contracts.
  * `src/timing/timing-controller.ts`: Frame-synchronized controller with full lifecycle and guards.
  * `src/timing/timing-diagnostics.ts`: Statistical summary engine for verifying trial batches.
  * `src/timing/index.ts`: Barrel exports.
* **Standalone Browser PoC**:
  * `public/timing-poc.html`: Interactive browser application for 50+ trial timing validation.
  * `src/server/app.ts`: Static file middleware and `/timing-poc` endpoint.
* **Testing & Scripts**:
  * `tests/timing-engine.test.ts`: 8 comprehensive timing unit tests covering all edge cases.
  * `scripts/verify-timing-poc.ts`: Automated 50-trial verification script.
  * `docs/phase-4-checklist.md`: Phase 4 verification checklist.
* **Git Status**:
  * Implemented on branch `backend/timing-engine`.

---

## 7. Phase 5 — Results Aggregation, Analytics & Data Export (COMPLETED)

### Objectives Achieved
* Extended `SessionResponse` in PostgreSQL with `reactionTimeMs`, `isCorrect`, `timedOut`, `timingMeasurement`, and `clientMetadata`, eliminating persistence gaps while preserving Phase 3 session models.
* Evaluated trial correctness strictly against the frozen, immutable `ExperimentVersion` snapshot bound to the participant session.
* Implemented `ResultsService` (`src/domain/results.service.ts`) providing raw data queries, filtering (`sessionId`, `trialId`, `timedOut`, date ranges), and statistical aggregations (mean, median, sample standard deviation, response rate, accuracy rate).
* Implemented downloadable JSON export (`GET .../export.json`) and RFC 4180 compliant CSV export (`GET .../export.csv`) excluding `participantId` to preserve anonymity.
* Added 9 comprehensive automated tests (51/51 tests passing across 5 suites) and extended live smoke tests to 16 end-to-end HTTP steps.

### Deliverables & Changes Created
* **Database & Persistence**:
  * `prisma/schema.prisma`: Added `reactionTimeMs`, `isCorrect`, `timedOut`, `timingMeasurement`, `clientMetadata`, and indexes to `SessionResponse`.
  * Applied migration `20260926064429_add_session_response_results_fields`.
  * `src/domain/session.service.ts`: Updated response recording with snapshot correctness evaluation and telemetry.
* **Domain & Validation (`src/domain/`, `src/schemas/`)**:
  * `src/schemas/results.schema.ts`: Zod query validation schemas.
  * `src/domain/results.service.ts`: Raw querying, statistics calculations, and export formatters.
* **Server Routes**:
  * `src/server/routes/results.routes.ts`: Endpoints for results, summary, export.json, and export.csv.
  * Mounted in `src/server/app.ts` under `/api/v1/experiments/:experimentId/results` and `/experiments/:experimentId/results`.
* **Testing & Scripts**:
  * `tests/results.test.ts`: 9 automated integration tests covering all features.
  * `scripts/smoke-test.ts`: Extended with 4 live Phase 5 verification tests (16/16 passing).
  * `docs/phase-5-checklist.md`: Phase 5 verification checklist.
* **Git Status**:
  * Implemented on branch `backend/results-analytics`.

---

## 8. Phase 6 — Stimulus & Trial Randomization Engine (COMPLETED)

### Objectives Achieved
* **Session-Level Randomization**: Trial order randomization evaluated strictly at session creation time; original `Experiment` definition and frozen `ExperimentVersion` snapshots remain 100% immutable.
* **Deterministic Pseudo-Random Number Generation**: Implemented a pure TypeScript Mulberry32 PRNG with 32-bit FNV-1a seed hashing (`src/randomization/seeded-random.ts`), eliminating all dependence on non-deterministic `Math.random()`.
* **Seeded Fisher-Yates (Knuth) Shuffle**: Built a non-mutating shuffle engine (`src/randomization/fisher-yates.ts`) that guarantees complete, non-duplicate trial permutations.
* **Cryptographic Seed Generation**: Generates 128-bit CSPRNG seeds (`crypto.randomBytes(16).toString('hex')`) upon session start (`src/randomization/seed-generator.ts`).
* **Database Persistence**: Extended `Session` model with `randomizationEnabled`, `randomizationSeed`, and `trialOrder` (`string[]`), fully capturing the execution order.
* **Execution Engine Integration**: Updated `ExecutionEngine.advanceLinearSequence` and `SessionService` to advance along the persisted `trialOrder`, seamlessly preserving backward compatibility with fixed-order studies.
* **Reproducibility & Auditability**: Any session's exact sequence can be reconstructed deterministically from its seed and snapshot.
* **Snapshot Isolation**: Version bumping on published updates ensures existing randomized sessions continue on their original version and sequence without disruption.

### Deliverables & Key Files
* **Randomization Core**:
  * `src/randomization/seeded-random.ts`: FNV-1a seed hasher and Mulberry32 generator.
  * `src/randomization/fisher-yates.ts`: Seeded non-mutating Fisher-Yates shuffle.
  * `src/randomization/seed-generator.ts`: Cryptographic seed generator.
  * `src/randomization/index.ts`: Public module barrel export.
* **Engine & Domain Updates**:
  * `src/engine/execution-engine.ts`: SessionContext `trialOrder` support and linear sequence traversal.
  * `src/domain/session.service.ts`: Session initialization with seed generation, shuffle execution, and order persistence.
  * `src/domain/experiment.service.ts`: Automated version bumping on published experiment updates.
  * `src/schemas/experiment.schema.ts` & `src/types/experiment.d.ts`: `config.randomization.enabled` schema.
* **Database Migration**:
  * `prisma/migrations/20260926065813_add_session_randomization_fields/`: Added `randomizationEnabled`, `randomizationSeed`, and `trialOrder` columns to `sessions`.
* **Testing & Verification**:
  * `tests/randomization.test.ts`: 15 comprehensive unit & integration tests covering PRNG uniformity, Fisher-Yates invariants, seed persistence, out-of-order rejection, and snapshot isolation.
  * `scripts/smoke-test.ts`: Extended with live HTTP verification of 4-trial randomized experiment execution (17/17 passing).
  * `docs/phase-6-checklist.md`: Complete technical checklist and verification audit.
* **Git Status**:
  * Implemented on branch `backend/randomization`.

---

## 9. Phase 7 — Dynamic Conditional Branching Engine (COMPLETED)

### Objectives Achieved
* **Response-Correctness Branching**: Implemented runtime conditional trial routing where a trial can specify `branching: { ifCorrect: string, ifIncorrect: string }`.
* **Zero Database Migration**: Reused the existing `Trial.branching Json?` column established in Phase 2, maintaining 100% database schema stability.
* **Precedence Architecture**:
  1. Priority 1: If current trial has branching $\to$ branch target determines next trial.
  2. Priority 2: If current trial has no branching and session is randomized $\to$ `session.trialOrder` determines next trial.
  3. Priority 3: If current trial has no branching and session is linear $\to$ `currentTrial.nextTrialId` pointer determines next trial.
* **Snapshot Isolation**: Branching rules resolve strictly against the session's locked `ExperimentVersion.snapshotData`, completely immune to subsequent researcher republishing.
* **Multi-Layer Loop Protection**:
  * Reject direct self-referential branching (`ifCorrect === trial.id || ifIncorrect === trial.id`) at publish validation.
  * Cap runtime session execution at $\max(100, N_{\text{trials}} \times 10)$, returning a controlled 400 `EXECUTION_LIMIT_EXCEEDED` if a cycle is encountered.
* **Participant Privacy**: Strip `branching` from participant-facing trial payloads (`branching: null`), preventing client-side inspection.

### Deliverables & Key Files
* **Engine & Domain Updates**:
  * `src/engine/execution-engine.ts`: Added conditional branching resolution to `advanceLinearSequence` and `hasCorrectnessBranching` helper.
  * `src/domain/session.service.ts`: Passed `isCorrect` and `randomizationEnabled` into `advanceLinearSequence`, added runtime loop protection bound.
  * `src/schemas/trial.schema.ts` & `src/types/experiment.d.ts`: Added `CorrectnessBranchingRule` / `correctnessBranchingSchema`.
  * `src/schemas/experiment.schema.ts`: Added graph validation verifying existence of `ifCorrect` and `ifIncorrect` targets and rejecting self-referential loops.
* **Testing & Verification**:
  * `tests/branching.test.ts`: 14 comprehensive unit & integration tests covering unit resolution, publish validation, live session branching, snapshot isolation, and randomization precedence.
  * `scripts/smoke-test.ts`: Extended with live HTTP verification of conditional branching (18/18 passing).
  * `docs/phase-7-checklist.md`: Complete technical checklist and verification audit.
* **Git Status**:
  * Implemented on branch `backend/branching`.

---

## 10. Upcoming Phases Roadmap

### Phase 8: Authentication & Production Hardening
* **Goal**: Production-ready security, researcher accounts, and IRB/GDPR compliance.
* **Key Deliverables**:
  1. JWT-based researcher authentication and RBAC.
  2. Rate limiting, CORS policies, and participant anonymity audits.
  3. Containerization (Dockerfile) and deployment configuration.
