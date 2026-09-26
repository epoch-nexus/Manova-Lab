# Manova Labs — Phase 5 Implementation Checklist

This document tracks all deliverables, architectural guardrails, and verification steps for Phase 5 (Results Aggregation, Analytics & Data Export).

---

### 1. Phase 5 Technical Decisions

1. **Integrated Response & Result Storage**:
   * Rather than introducing a redundant results table, the existing `SessionResponse` model in `prisma/schema.prisma` was cleanly extended with:
     * `reactionTimeMs` (`Float?`): Measured latency from Phase 4 timing engine.
     * `isCorrect` (`Boolean?`): Automated correctness classification.
     * `timedOut` (`Boolean`, default `false`): Timeout indicator.
     * `timingMeasurement` (`Json?`): Preserves full Phase 4 telemetry (`stimulusOnsetTimestamp`, `responseTimestamp`, `hardwarePrecision`).
     * `clientMetadata` (`Json?`): Captures environment and viewport metadata.
2. **Snapshot-Bound Correctness Evaluation**:
   * Evaluated strictly against the immutable `ExperimentVersion` snapshot bound to the participant session in `SessionService.submitResponse`:
     * When `evaluationMode === 'exact_match'`: `isCorrect = (submittedResponse === correctResponse && !timedOut)`.
     * When `evaluationMode === 'none'`: `isCorrect = null`.
   * Guarantees that subsequent researcher edits to an experiment cannot alter correctness evaluations of historical sessions.
3. **Statistical Aggregation Definitions**:
   * **Valid Reaction Times**: `reactionTimeMs !== null && timedOut === false && reactionTimeMs >= 0`. Timeouts and null responses are never treated as 0 ms.
   * **Mean RT**: $\frac{\sum \text{validRTs}}{N_{\text{valid}}}$. Returns `null` when $N_{\text{valid}} = 0$.
   * **Median RT**: Sorted middle element (or average of two middle elements). Returns `null` when $N_{\text{valid}} = 0$.
   * **Sample Standard Deviation ($s$)**: $\sqrt{\frac{\sum (x_i - \bar{x})^2}{N - 1}}$ for $N > 1$, `0` for $N = 1$, and `null` for $N = 0$.
   * **Response Rate**: Explicitly defined as `(number of non-timeout responses) / (total response records)`. Returns `null` when there are 0 records.
   * **Accuracy Rate**: `correctResponses / (correctResponses + incorrectResponses)`. Returns `null` when no evaluated responses exist.
4. **Participant Anonymity & Export Design**:
   * `participantId` is intentionally excluded from the CSV export. `sessionId` serves as the anonymous run identifier.
   * Zero PII (names, emails, phone numbers, IP addresses) is stored.
   * CSV export adheres strictly to RFC 4180 escaping (double-quote wrapping for cells with commas, quotes, or newlines).

---

### 2. Results & Analytics Architecture

```text
               Participant Browser
                        │
                        │ response + timing telemetry
                        ▼
             Participant Response API
          (POST .../trials/:id/response)
                        │
                        ▼
                 Session Service
                        │
                        ▼
               PostgreSQL Database
          (Session + SessionResponse)
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   Results Service             Results Service
   (Raw Data & Filters)      (Statistical Aggregation)
          │                           │
          ▼                           ▼
    JSON / CSV Export         Researcher Analytics API
(GET .../results/export.*)    (GET .../results/summary)
```

---

### 3. API Endpoints Implemented

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/experiments/:experimentId/results` | Returns trial-level participant response records with filtering | `200 OK` |
| `GET` | `/api/v1/experiments/:experimentId/results/summary` | Returns aggregated descriptive statistics (experiment or trial level) | `200 OK` |
| `GET` | `/api/v1/experiments/:experimentId/results/export.json` | Exports complete trial records as downloadable JSON | `200 OK` |
| `GET` | `/api/v1/experiments/:experimentId/results/export.csv` | Exports complete trial records as standardized RFC 4180 CSV | `200 OK` |

#### Supported Query Filters (`GET .../results`)
* `sessionId` (`string`): Filter to a specific participant session.
* `trialId` (`string`): Filter to a specific trial.
* `timedOut` (`boolean`): Filter by timeout status (`true` or `false`).
* `from` / `to` (`ISO 8601`): Filter responses by submission timestamp.
* `limit` / `offset` (`number`): Pagination window.

---

### 4. Database Schema & Migration

* **Prisma Migration**: `20260926064429_add_session_response_results_fields`
* **Added Fields to `SessionResponse`**:
  * `reactionTimeMs Float?`
  * `isCorrect Boolean?`
  * `timedOut Boolean @default(false)`
  * `timingMeasurement Json?`
  * `clientMetadata Json?`
* **Added Indexes**:
  * `@@index([sessionId])`
  * `@@index([trialId])`
  * `@@index([submittedAt])`

---

### 5. CSV Export Specification

* **MIME Type**: `text/csv; charset=utf-8`
* **Header Row**:
  ```csv
  sessionId,experimentId,experimentVersion,trialId,submittedResponse,isCorrect,reactionTimeMs,timedOut,stimulusOnsetTimestamp,responseTimestamp,timingMethod,displayRefreshRateEstimateHz,hiddenTabDetected,submittedAt
  ```
* **Privacy Guarantee**: `participantId` is omitted.
* **Escaping**: Native TypeScript implementation following RFC 4180 (no external CSV library dependencies).

---

### 6. Deliverables & Verification Checklist

- [x] **Prisma Migration**:
  - [x] `prisma/schema.prisma` updated.
  - [x] Migration `20260926064429_add_session_response_results_fields` created and applied.
  - [x] Prisma client re-generated.
- [x] **Domain & Persistence Layer**:
  - [x] `src/domain/session.service.ts`: Snapshot-based correctness evaluation and telemetry persistence.
  - [x] `src/domain/results.service.ts`: Raw querying, filtering, statistical aggregation, JSON & CSV formatters.
- [x] **Validation Schemas**:
  - [x] `src/schemas/results.schema.ts`: Zod schemas for query parameters.
  - [x] Barrel export updated in `src/schemas/index.ts`.
- [x] **Server Routes & Mounting**:
  - [x] `src/server/routes/results.routes.ts`: Express routes with parameter validation and headers.
  - [x] Mounted in `src/server/app.ts` under `/api/v1/experiments/:experimentId/results` and `/experiments/:experimentId/results`.
- [x] **Automated Tests (`tests/results.test.ts`)**:
  - [x] Empty experiment handling (empty array and null stats).
  - [x] Multi-session, multi-trial execution with exact mathematical calculations.
  - [x] Trial-level summary aggregation (`?trialId=...`).
  - [x] Filtering by session, trial, and timeout status.
  - [x] JSON export with headers and structured payload.
  - [x] CSV export verification without `participantId` and with RFC 4180 escaping.
  - [x] Cross-experiment data isolation.
  - [x] Error handling (404 for non-existent experiments).
  - [x] Total: **51/51 automated tests passing across 5 test suites**.
- [x] **Live Smoke Tests (`scripts/smoke-test.ts`)**:
  - [x] Extended to 16 live HTTP steps against live PostgreSQL.
  - [x] All 16 live smoke tests passed.
- [x] **Boundary Guardrail Checks**:
  - [x] Zero randomization / counterbalancing / Latin squares (Phase 6 deferred).
  - [x] Zero conditional branching evaluation (Phase 7 deferred).
  - [x] Zero authentication / JWT / RBAC (Phase 8 deferred).
  - [x] Zero frontend dashboards or UI components.
  - [x] Zero external analytics packages, ML, ANOVA/MANOVA.
  - [x] Zero PII collection.
  - [x] Zero alterations to Phase 4 timing measurement semantics.

---

### Final Phase 5 Verification Status

**Phase 5 Status: COMPLETE & VERIFIED**
