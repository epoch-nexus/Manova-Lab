# Manova Labs — Phase 7 Implementation Checklist

This document tracks all deliverables, architectural decisions, and verification steps for Phase 7 (Dynamic Conditional Branching Engine).

---

### 1. Phase 7 Technical Decisions

1. **Minimal Correctness Branching Model**:
   * Phase 7 implements a strictly defined response-correctness branching rule:
     ```json
     {
       "branching": {
         "ifCorrect": "trial-id-A",
         "ifIncorrect": "trial-id-B"
       }
     }
     ```
   * When participant submits a response for the active trial:
     * If `isCorrect === true`: The engine routes progression directly to `branching.ifCorrect`.
     * If `isCorrect === false` (or `null` / timed out): The engine routes progression directly to `branching.ifIncorrect`.
   * **Security Boundary**: Zero arbitrary expression evaluation, zero researcher-supplied JavaScript execution, zero `eval()`, and zero general-purpose scripting languages. Branching operates strictly over declarative, validated data structures.

2. **Database Persistence & Zero Migration Overhead**:
   * Uses the pre-existing `Trial.branching Json?` column established in Phase 2.
   * Zero relational schema alterations or database migrations were required, fulfilling the architectural guarantee that the Phase 2 schema was forward-compatible with conditional branching.

3. **Randomization & Branching Precedence**:
   * When both Phase 6 trial randomization and Phase 7 conditional branching are present in an experiment:
     1. **Priority 1 (Conditional Branching)**: If the current trial defines valid correctness branching (`ifCorrect` and `ifIncorrect`), the branching decision takes immediate precedence and explicitly dictates the next trial.
     2. **Priority 2 (Randomized Trial Order)**: If the current trial does not define branching, progression follows the session's pre-computed `session.trialOrder`.
     3. **Priority 3 (Linear Pointer)**: In non-randomized, non-branching experiments, progression follows the linear pointer (`currentTrial.nextTrialId`).
   * Branching **never** triggers a re-shuffle; the session's `randomizationSeed` and original `trialOrder` remain permanently intact.

4. **Snapshot Isolation**:
   * All branching decisions resolve strictly against the session's locked `ExperimentVersion.snapshotData` (`snap_<expId>_v<version>`).
   * When a researcher updates and republishes an experiment ($v1 \to v2$):
     * Active $v1$ sessions execute the $v1$ snapshot's branch definitions.
     * New $v2$ sessions execute the $v2$ snapshot's branch definitions.

5. **Loop Protection & Execution Graph Safeguards**:
   * **Publish-Time Validation**:
     * `ifCorrect` and `ifIncorrect` must both be valid UUIDs referencing existing trials within the same experiment.
     * **Self-Referential Prevention**: Direct self-referential branching (`ifCorrect === trial.id || ifIncorrect === trial.id`) is rejected with a 400 validation error.
     * At least one terminal trial (`nextTrialId: null`) must exist in the experiment graph.
   * **Runtime Execution Safety Bound**:
     * In `SessionService.submitResponse`, the total responses recorded for a session are capped at $\max(100, N_{\text{trials}} \times 10)$.
     * If a cyclic execution exceeds this bound, the engine throws a controlled 400 error (`EXECUTION_LIMIT_EXCEEDED`) rather than hanging the server or entering an infinite loop.

---

### 2. Branching Engine Architecture

```text
                        Participant Submits Response
                                     │
                                     ▼
                      SessionService.submitResponse
                        (Evaluates isCorrect vs Snapshot)
                                     │
                                     ▼
                      ExecutionEngine.advanceLinearSequence
                                     │
                   ┌─────────────────┴─────────────────┐
                   │ Does currentTrial have branching? │
                   └─────────────────┬─────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼ YES                                 ▼ NO
       Is response correct?               Is session.randomizationEnabled?
         ┌────────┴────────┐                    ┌────────┴────────┐
         ▼ true            ▼ false              ▼ YES             ▼ NO
   Target: ifCorrect Target: ifIncorrect   Follow trialOrder  Follow nextTrialId
         └────────┬────────┘                    └────────┬────────┘
                  ▼                                      ▼
            Resolve Trial                          Resolve Trial
        from Bound Snapshot                    from Bound Snapshot
                  │                                      │
                  └──────────────────┬───────────────────┘
                                     ▼
                       Update Participant Session:
                       - currentTrialId = nextTrial.id
                       - currentTrialIndex updated
                       - Session completed if terminal
```

---

### 3. API & Data Contract

#### Trial Branching Schema (`src/schemas/trial.schema.ts`)
```ts
export const correctnessBranchingSchema = z.object({
  ifCorrect: z.string().uuid('ifCorrect must be a valid trial UUID'),
  ifIncorrect: z.string().uuid('ifIncorrect must be a valid trial UUID'),
});
```

#### Participant Privacy
* The participant-facing API (`GET /sessions/:sessionId/current-step`, `POST /sessions/:sessionId/trials/:id/response`) strips the `branching` field completely (`branching: null`). Participants never receive routing logic or answers in advance.

---

### 4. Verification Checklist

- [x] **Branching Unit Tests (`tests/branching.test.ts`)**:
  - [x] Correct response routes to `ifCorrect`.
  - [x] Incorrect response routes to `ifIncorrect`.
  - [x] Non-branching trials follow linear progression.
  - [x] Terminal trial without branching completes experiment.
  - [x] Corrupted/missing branch target in snapshot throws controlled error.
- [x] **Publish-Time Validation Tests**:
  - [x] Valid branch targets pass validation and publish cleanly.
  - [x] Nonexistent `ifCorrect` fails validation with descriptive error.
  - [x] Nonexistent `ifIncorrect` fails validation with descriptive error.
  - [x] Self-referential branch targets fail validation.
- [x] **Session Integration Tests**:
  - [x] Correct response causes branch to correct target and returns it in `current-step`.
  - [x] Incorrect response causes branch to incorrect target and returns it in `current-step`.
  - [x] Branched session continues through subsequent trials to completion.
  - [x] Session state (`status`, `completedAt`, `executionState`) remains consistent after branching.
- [x] **Snapshot Isolation Tests**:
  - [x] $v1$ sessions execute $v1$ branching rules even after $v2$ is published with inverted branching rules.
  - [x] $v2$ sessions execute $v2$ branching rules.
- [x] **Randomization Compatibility Tests**:
  - [x] Randomized session without branching behaves exactly as Phase 6.
  - [x] Branching overrides normal trialOrder progression on branched trials.
  - [x] Randomization seed and `trialOrder` remain unchanged after branching.
- [x] **Live Smoke Tests (`scripts/smoke-test.ts`)**:
  - [x] Step 18 verified: rejection of invalid branch target, correct branch execution, incorrect branch execution, terminal completion.
- [x] **Regression & Type Safety**:
  - [x] All 80 automated tests passing across 7 suites.
  - [x] TypeScript compiler (`tsc --noEmit`) passes with 0 errors.
  - [x] Production build (`npm run build`) completes cleanly.
  - [x] Database migration status up to date.

---

### 5. Architectural Guardrails & Exclusions

- [x] **Zero Dynamic Code Execution**: No `eval()`, `Function`, or custom expression languages.
- [x] **Zero Auth / JWT / RBAC**: Security and researcher accounts strictly deferred to Phase 8.
- [x] **Zero DB Migrations**: Reused existing JSONB schema seam.
- [x] **Zero Timing Alterations**: Phase 4 high-precision timing engine remains untouched.
- [x] **Zero Statistical Definition Changes**: Phase 5 results aggregation remains fully compatible.

---

### 6. Known Limitations

1. **Condition Scope**:
   * Phase 7 strictly supports binary response-correctness branching (`ifCorrect` / `ifIncorrect`). Latency-contingent branching (e.g., *if reactionTimeMs > 1000*) and arbitrary multi-condition rule matrices are not supported in this minimal specification.
2. **Terminal Requirement**:
   * Branch paths must eventually converge or terminate at a trial with `nextTrialId: null` or the experiment end; infinite loops are guarded at runtime via execution step caps.
