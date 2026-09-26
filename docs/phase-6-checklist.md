# Manova Labs — Phase 6 Implementation Checklist

This document tracks all deliverables, architectural decisions, and verification steps for Phase 6 (Stimulus & Trial Randomization Engine).

---

### 1. Phase 6 Technical Decisions

1. **Randomization vs. Branching Distinction**:
   * **Randomization (Phase 6)**: Changes the *order* of a fixed set of predefined trials prior to execution (e.g., $A \to B \to C \to D \implies C \to A \to D \to B$). Every trial is executed exactly once; the execution remains strictly linear along the session-specific permutation.
   * **Branching (Phase 7 Deferred)**: Dynamic routing where the next trial depends on runtime participant inputs (e.g., *if answer is A, proceed to Trial C, else proceed to Trial D*). Phase 6 explicitly does **NOT** implement branching or dynamic graphs.

2. **Seeded Fisher-Yates (Knuth) Shuffle (`src/randomization/fisher-yates.ts`)**:
   * Pure, non-mutating function accepting `readonly T[]` and a deterministic `seed` (string or number).
   * Allocates a shallow copy of the input array.
   * Traverses indices from $N - 1$ down to 1, swapping each element $i$ with a pseudorandom index $j \in [0, i]$.
   * Returns a complete, non-duplicate permutation containing all original trial IDs.

3. **Deterministic PRNG via Mulberry32 & FNV-1a (`src/randomization/seeded-random.ts`)**:
   * Zero reliance on `Math.random()`.
   * Cryptographic string seeds are hashed to a 32-bit unsigned integer using the FNV-1a 32-bit hash algorithm.
   * Uses Mulberry32, a fast, high-quality 32-bit generator with period $2^{32}$, yielding uniform values in $[0, 1)$.
   * Produces identical output sequences across identical seeds, satisfying strict scientific reproducibility requirements.

4. **Cryptographic Seed Generation (`src/randomization/seed-generator.ts`)**:
   * Uses Node.js native `crypto.randomBytes(16).toString('hex')`.
   * Generates a 128-bit CSPRNG hex string (32 characters).
   * Never relies on `Date.now()` or timestamps alone.

5. **Session-Level Randomization Architecture**:
   * The published `Experiment` definition and frozen `ExperimentVersion` snapshot are **NEVER mutated**.
   * Randomization is evaluated **once** upon session creation (`POST /api/v1/participant/experiments/:publicSlug/sessions`).
   * When `experiment.config.randomization.enabled === true`:
     1. A fresh 128-bit cryptographic seed is generated.
     2. The original ordered trial IDs from the snapshot are shuffled using the seeded Fisher-Yates engine.
     3. The session is persisted with:
        * `randomizationEnabled = true`
        * `randomizationSeed = <seed>`
        * `trialOrder = [<shuffled trial IDs>]`
   * When randomization is disabled (default):
     * `randomizationEnabled = false`
     * `randomizationSeed = null`
     * `trialOrder = [<original trial IDs in sequence>]`
   * Execution engine simply traverses `trialOrder[currentTrialIndex]` without dynamic branching.

6. **Reproducibility Guarantee**:
   * Given the immutable experiment snapshot and the persisted `randomizationSeed`, the exact session trial order can be reconstructed deterministically at any point in time:
     $$\text{seededFisherYatesShuffle}(\text{snapshot.trials}, \text{session.randomizationSeed}) \equiv \text{session.trialOrder}$$

7. **Snapshot Isolation**:
   * Historical sessions remain locked to their `experimentSnapshotId` (`snap_<expId>_v<version>`).
   * If a researcher updates and republishes an experiment ($v1 \to v2$), existing $v1$ sessions execute their persisted $v1$ trial definitions in their assigned $v1$ randomized sequence. New sessions created on $v2$ receive the new trial definitions and fresh permutations.

---

### 2. Randomization Engine Architecture

```text
                        Experiment Definition (Draft or Published)
                                  │ config.randomization.enabled
                                  ▼
                   POST /experiments/:slug/sessions
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ (randomization disabled)                        │ (randomization enabled)
         ▼                                                 ▼
Linear Trial Order:                               CSPRNG Seed Generator
[T1, T2, T3, T4]                                 (Node.js crypto.randomBytes)
         │                                                 │ seed = "d31043..."
         │                                                 ▼
         │                                      Seeded Fisher-Yates PRNG
         │                                      (Mulberry32 + FNV-1a)
         │                                                 │
         │                                                 ▼
         │                                      Permuted Trial Order:
         │                                      [T3, T1, T4, T2]
         └────────────────────────┬────────────────────────┘
                                  ▼
                        Persist to PostgreSQL:
                        Session {
                          randomizationEnabled: boolean,
                          randomizationSeed: string | null,
                          trialOrder: string[]
                        }
                                  │
                                  ▼
                       Participant API Runtime:
                  GET  /participant/sessions/:id
                  POST /participant/sessions/:id/trials/:id/response
                  (Traverses trialOrder[0] -> trialOrder[1] -> ... -> Complete)
```

---

### 3. Database Schema Changes

* **Prisma Migration**: `20260926065813_add_session_randomization_fields`
* **Added Fields to `Session` Model (`prisma/schema.prisma`)**:
  ```prisma
  // Phase 6: Trial randomization
  randomizationEnabled Boolean           @default(false)
  randomizationSeed    String?
  trialOrder           Json?
  ```
* **Payload Size Optimization**: Persists trial IDs only (`string[]`), never copying entire Trial / Stimulus entities into `Session`.

---

### 4. API & Configuration Contract

#### Experiment Configuration (`src/types/experiment.d.ts` & `src/schemas/experiment.schema.ts`)
```json
{
  "config": {
    "displayMode": "fullscreen",
    "backgroundColor": "#0F172A",
    "allowPause": false,
    "showFeedback": true,
    "randomization": {
      "enabled": true
    }
  }
}
```
* Default behavior when omitted: `randomization: { enabled: false }`.
* Backwards compatible with all Phase 1–5 experiments.

#### Participant API Endpoints (Preserved Without Breaking Changes)
* `POST /api/v1/participant/experiments/:publicSlug/sessions`
* `GET  /api/v1/participant/sessions/:sessionId`
* `GET  /api/v1/participant/sessions/:sessionId/current-step`
* `POST /api/v1/participant/sessions/:sessionId/trials/:trialId/response`

The participant runtime receives trials strictly according to the session's persisted `trialOrder`. `randomizationSeed` is kept internal on the session record and not leaked to participants.

---

### 5. Verification Checklist

- [x] **Randomization Module Unit Tests (`src/randomization/`)**:
  - [x] Fisher-Yates returns all original trial IDs exactly once.
  - [x] No duplicate trial IDs in shuffled output.
  - [x] Identical seed produces identical permutation (deterministic).
  - [x] Different seeds produce distinct permutations.
  - [x] Input array is never mutated.
  - [x] Handles empty array and single-trial array cleanly.
  - [x] Seed generator produces 32-character hex CSPRNG string.
  - [x] PRNG generates uniform values in $[0, 1)$.
- [x] **Session Integration Tests (`tests/randomization.test.ts`)**:
  - [x] Randomization disabled $\to$ original sequential order.
  - [x] Randomization enabled $\to$ persisted seed and shuffled `trialOrder`.
  - [x] Session stores `randomizationSeed` and `trialOrder`.
  - [x] Initial step starts at `trialOrder[0]`.
  - [x] Subsequent responses progress through `trialOrder[1]`, `trialOrder[2]`, etc.
  - [x] Out-of-sequence trial submissions are rejected with 400 `INVALID_RESPONSE`.
  - [x] Randomized session completes successfully upon terminal trial.
  - [x] Two independently created sessions receive independent seeds and orders.
  - [x] Recreating shuffle from stored seed reproduces exact stored order.
- [x] **Snapshot Isolation Tests**:
  - [x] Sessions bound to $v1$ continue running $v1$ trial definitions and orders even after researcher republishes as $v2$.
- [x] **Regression & Live Smoke Tests**:
  - [x] All 66 automated tests passing across 6 suites.
  - [x] TypeScript compiler (`tsc --noEmit`) passes with 0 errors.
  - [x] Production build (`npm run build`) completes cleanly.
  - [x] All 17 live HTTP smoke tests passing (`scripts/smoke-test.ts`).
  - [x] Prisma migration status in sync.

---

### 6. Architectural Guardrails & Exclusions

- [x] **Zero `Math.random()`**: All pseudorandom generation uses Mulberry32 with FNV-1a hashing; all seeds use Node CSPRNG.
- [x] **Zero Snapshot Mutation**: Published `ExperimentVersion.snapshotData` is never modified.
- [x] **Zero Phase 7 Branching**: No conditional branching, dynamic DAG evaluation, or input-dependent routing implemented.
- [x] **Zero Counterbalancing / Latin Squares**: Advanced block balancing deferred to future extensions.
- [x] **Zero External Randomization Libraries**: Zero npm packages added; pure TypeScript implementations.
- [x] **Zero Auth / JWT / UI Work**: Adheres strictly to backend core-logic boundaries.

---

### 7. Known Scientific & Technical Limitations

1. **Pseudo-Randomness vs. Hardware Randomness**:
   * Seeds are generated using Node's cryptographic random byte generator (`crypto.randomBytes`), while intra-session shuffling relies on the 32-bit Mulberry32 PRNG. While suitable for behavioral experiments, it does not represent physical quantum randomness.
2. **Experimental Design Validity**:
   * Pure randomization minimizes order effects across a population, but does not guarantee counterbalancing (e.g., Latin squares) or block balancing within individual sessions. Researchers should account for this when analyzing small sample sizes ($N < 30$).
