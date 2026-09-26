# Manova Labs — Phase 2 Implementation Checklist

This document tracks all deliverables, architectural guardrails, and verification steps for Phase 2 (Runtime Validation, PostgreSQL Persistence & REST API).

---

### Phase 2 Technical Decisions

1. **HTTP Framework: Express 5**
   * **Reasoning**: Chosen for maximal hackathon delivery velocity, rock-solid middleware ecosystem, straightforward centralized error handling, and zero-friction synchronous testing integration with `supertest`.
2. **ORM & Query Layer: Prisma 5.22 + PostgreSQL**
   * **Reasoning**: Strongly typed client generation, declarative schema modeling, automated atomic migrations, and native JSONB column support for flexible telemetry/styling storage without polluting relational schemas.
3. **Validation Engine: Zod 3.23**
   * **Reasoning**: Composable, strict runtime schema validation with automatic TypeScript type inference directly aligned with `src/types/experiment.d.ts`.
4. **Snapshot & Versioning Mechanism: Dedicated `ExperimentVersion` Table with JSONB Snapshots**
   * **Reasoning**: Stores a completely frozen, immutable snapshot (`snapshotData`) keyed by `snap_<experimentId>_v<version>` upon publication, completely isolating participant sessions from live draft edits.

---

### Deliverables Checklist

- [x] **PostgreSQL Database Running**: Live PostgreSQL instance initialized and configured via `.env` (`manova_labs`).
- [x] **Prisma Schema Designed (`prisma/schema.prisma`)**:
  - [x] `Experiment` model with status (`DRAFT` / `PUBLISHED`), versioning, timestamps, and config JSONB.
  - [x] `Trial` model with `orderIndex`, `timingConfig`, `nextTrialId` pointer, and reserved `branching` JSONB.
  - [x] `Stimulus` model with type-discriminated columns and styling/metadata JSONB.
  - [x] `ExpectedResponse` model with allowed keys/buttons, correct response, and evaluation mode.
  - [x] `ExperimentVersion` model storing frozen snapshot definitions.
- [x] **Prisma Migrations Applied**:
  - [x] Migration `20260926055133_init_experiment_persistence` created and applied cleanly.
- [x] **Zod Validation Schemas Implemented (`src/schemas/`)**:
  - [x] `stimulus.schema.ts`: Discriminated union for text and image stimuli.
  - [x] `trial.schema.ts`: Fixation, timing config, expected response validation.
  - [x] `experiment.schema.ts`: Title length (3-120), publicSlug regex, non-empty trials, unique trial IDs, pointer integrity, and terminal trial requirement.
  - [x] `publishValidationSchema`: Pre-publish integrity gate.
- [x] **Centralized Error Handling (`src/server/errors.ts`, `src/server/middleware/errorHandler.ts`)**:
  - [x] Unified error envelope: `{ error: { code, message, details } }`.
  - [x] Maps `NotFoundError` -> 404 `EXPERIMENT_NOT_FOUND`.
  - [x] Maps `BadRequestError` / `ZodError` -> 400 `INVALID_EXPERIMENT`.
  - [x] Maps `ValidationError` -> 422 `VALIDATION_ERROR`.
  - [x] Maps `ConflictError` / Prisma unique constraint (P2002) -> 409 `EXPERIMENT_ALREADY_PUBLISHED`.
  - [x] Falls back to 500 `INTERNAL_SERVER_ERROR`.
- [x] **Researcher API Endpoints Implemented (`src/server/routes/experiment.routes.ts`)**:
  - [x] `POST   /experiments`: Creates draft experiment (`201 Created`).
  - [x] `GET    /experiments`: Lists all experiments with trial counts (`200 OK`).
  - [x] `GET    /experiments/:id`: Retrieves full experiment with trials and stimuli (`200 OK`).
  - [x] `PUT    /experiments/:id`: Updates experiment metadata and trials (`200 OK`).
  - [x] `DELETE /experiments/:id`: Deletes experiment (`204 No Content`).
  - [x] `POST   /experiments/:id/publish`: Validates and freezes immutable snapshot (`200 OK`).
  - [x] `GET    /health`: Operational liveness healthcheck (`200 OK`).
- [x] **Automated Tests Passing (`tests/experiments.test.ts`)**:
  - [x] 15/15 tests passing across all endpoints, publishing validation, and error states.
- [x] **Live API Smoke Tests Passing (`scripts/smoke-test.ts`)**:
  - [x] 9/9 live HTTP requests verified against real running PostgreSQL instance.
- [x] **Boundary Guardrails Respected**:
  - [x] `src/engine/` contains only `.gitkeep` (zero execution runtime logic).
  - [x] No auth / JWT / password libraries installed.
  - [x] No participant / session / response-result tables created.
  - [x] No participant execution endpoints implemented.
- [x] **Contract Integrity Verified**:
  - [x] Zero breaking changes to `docs/api.md` or `src/types/experiment.d.ts`.

---

### Final Phase 2 Verification Status

**Phase 2 Status: COMPLETE**
