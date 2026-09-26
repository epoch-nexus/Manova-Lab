# Manova Labs — Phase 3 Implementation Checklist

This document tracks all deliverables, architectural guardrails, and verification steps for Phase 3 (Experiment Execution Engine & State Machine).

---

### 1. Phase 3 Technical Decisions

1. **State Machine Separation**:
   * Isolated pure state transition logic in `src/engine/execution-engine.ts` and `src/engine/execution-state.ts`, decoupling state resolution from HTTP/Express concerns and database transactions.
2. **Snapshot-Driven Progression**:
   * Participant sessions query against the immutable JSON snapshot stored in `ExperimentVersion.snapshotData`, completely ignoring subsequent mutable draft edits.
3. **Atomic Response Concurrency**:
   * Enforced concurrency and idempotency using PostgreSQL transactions with a composite unique constraint `@@unique([sessionId, trialId])` on `SessionResponse`. Prevents concurrent duplicate submissions from advancing the session twice.
4. **Answer Protection (Integrity)**:
   * `ExecutionEngine.stripTrial()` removes `correctResponse` and `branching` from participant-facing trial payloads to prevent client-side inspection.

---

### 2. Execution Architecture

```text
HTTP Request (Participant)
       ↓
participant.routes.ts
       ↓
SessionService (Database Transactions & Snapshot Retrieval)
       ↓
ExecutionEngine (Pure State Machine: Current Step Resolution & Linear Advancement)
       ↓
Session State Transition (IN_PROGRESS → COMPLETED)
       ↓
Response to Participant (Current Step / Next Trial / Completion Message)
```

---

### 3. Participant API Endpoints Implemented

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/participant/experiments/:publicSlug/sessions` | Initialize anonymous participant session bound to published snapshot | `201 Created` |
| `GET` | `/api/v1/participant/sessions/:sessionId` | Get current execution step for participant | `200 OK` |
| `GET` | `/api/v1/participant/sessions/:sessionId/current-step` | Alias for current execution step | `200 OK` |
| `POST` | `/api/v1/participant/sessions/:sessionId/trials/:trialId/response` | Submit trial response and advance along linear sequence | `200 OK` |
| `POST` | `/api/v1/participant/sessions/:sessionId/abandon` | Explicitly abandon session | `200 OK` |

---

### 4. Session Lifecycle & State Model

```text
[POST .../sessions]
       ↓
[IN_PROGRESS / AWAITING_RESPONSE] (Trial 1)
       ↓ (Submit Response)
[RECORDED] ──▶ [NEXT_TRIAL]
       ↓ (Has Next Trial)
[IN_PROGRESS / AWAITING_RESPONSE] (Trial 2)
       ↓ (Submit Final Response)
[NEXT_TRIAL] (nextTrialId === null)
       ↓
[COMPLETED / COMPLETE] (Terminal debriefing message, further submissions rejected)
```

---

### 5. Snapshot Immutability Guarantee

* When Session $S_1$ is started for Experiment $E_1$ at Version 1, $S_1$ is permanently bound via foreign key to `ExperimentVersion.snapshotId`.
* If a researcher modifies $E_1$ and publishes Version 2, $S_1$ continues executing strictly from Version 1's frozen snapshot.
* New sessions started after Version 2 publication bind to Version 2.

---

### 6. Concurrency & Atomicity Guarantee

* Handled via `prisma.$transaction`.
* `session.currentTrialId === submittedTrialId` check ensures out-of-order or stale submissions are rejected.
* Unique constraint `@@unique([sessionId, trialId])` ensures parallel requests cannot record duplicate responses or advance the trial index twice.

---

### 7. Explicitly Deferred Features

| Feature | Scheduled Phase | Status in Phase 3 |
| :--- | :--- | :--- |
| **High-Precision Timing Engine** | **Phase 4** | Zero measurement or timer logic in engine; configured durations passed as static config. |
| **Response Analytics & Collection** | **Phase 5** | Only lightweight `SessionResponse` tracked for advancement state; full aggregation deferred. |
| **Randomization Engine** | **Phase 6** | Strictly linear deterministic progression; zero shuffling or random generators. |
| **Conditional Branching Engine** | **Phase 7** | Branching fields preserved in data but completely ignored during runtime transitions. |
| **Researcher Authentication / RBAC**| **Phase 8** | Researcher routes remain open for development; participant sessions remain anonymous. |

---

### 8. Deliverables & Verification Checklist

- [x] **Prisma Migration**: `20260926060339_add_participant_sessions` created and applied cleanly.
- [x] **Execution Engine Module**:
  - [x] `src/engine/execution-state.ts`
  - [x] `src/engine/execution-engine.ts`
- [x] **Participant Validation Schemas**:
  - [x] `src/schemas/participant.schema.ts`
- [x] **Session Service**:
  - [x] `src/domain/session.service.ts`
- [x] **Participant Routes & Express Integration**:
  - [x] `src/server/routes/participant.routes.ts`
  - [x] Mounted in `src/server/app.ts` (`/api/v1/participant` and `/participant`)
- [x] **Automated Tests**:
  - [x] `tests/execution-engine.test.ts` (9 unit tests passing)
  - [x] `tests/participant-execution.test.ts` (10 integration tests passing)
  - [x] `tests/experiments.test.ts` (15 regression tests passing)
  - [x] Total: **34/34 tests passing**
- [x] **Live API Smoke Tests**:
  - [x] `scripts/smoke-test.ts` (12 live HTTP tests passing against real PostgreSQL)
- [x] **Boundary Guardrail Checks**:
  - [x] Zero timing logic (`performance.now`, `requestAnimationFrame`) in `src/engine/`
  - [x] Zero randomization logic (`Math.random`, `Fisher-Yates`) in `src/engine/`
  - [x] Zero branching evaluator logic in `src/engine/`
  - [x] Zero new auth/session libraries in `package.json`
  - [x] Zero results/analytics modules in `src/`
- [x] **Contract Preservation**:
  - [x] Zero breaking changes to Phase 1 or Phase 2 contracts.

---

### Final Phase 3 Verification Status

**Phase 3 Status: COMPLETE**
