# Manova Labs — Phase 4 Implementation Checklist

This document tracks all deliverables, architectural guardrails, and verification steps for Phase 4 (High-Precision Timing Engine).

---

### 1. Phase 4 Technical Decisions

1. **Browser-Side Isolation**:
   * All timing measurement logic is strictly located on the client / browser side (`src/timing/timing-controller.ts`).
   * Zero timing measurement or timer logic was placed in the Phase 3 server-side execution engine (`src/engine/`).
2. **Elapsed-Time Measurement via `performance.now()`**:
   * Uses monotonic `DOMHighResTimeStamp` (`performance.now()`) with sub-millisecond precision.
   * `Date.now()` is strictly prohibited for reaction-time calculation to eliminate wall-clock clock drift, NTP adjustments, and leap second jumps.
3. **Display Frame Synchronization via `requestAnimationFrame()`**:
   * The timing engine explicitly distinguishes between:
     * *JavaScript decision to render* (`STIMULUS_PENDING_PRESENTATION`)
     * *Physical browser display rendering frame* (`STIMULUS_PRESENTED` latched inside `requestAnimationFrame`)
   * Note: The platform acknowledges that `requestAnimationFrame` aligns to browser compositing vsync cycles, but does not guarantee laboratory-grade physical photon emission latency (which depends on GPU pipeline, display scan-out, and panel response time).
4. **Visibility & Background Tab Policy**:
   * Monitors `document.visibilityState`. If a tab is hidden during a trial, the trial completes normally but telemetry flags `hiddenTabDetected: true` in `hardwarePrecision`.
   * This preserves trial flow while allowing Phase 5 data pipelines to filter throttled trials.
5. **Robust Input Guards**:
   * **Premature Responses**: Ignored during fixation (`PRE_STIMULUS`) when `allowEarlyResponse: false`.
   * **Duplicate Responses**: Input listener is immediately detached upon the first valid keypress, ensuring multiple key events never produce multiple RT measurements.
   * **Post-Timeout Responses**: Timeouts detach input listeners, transitioning directly to `TIMEOUT` and discarding late keypresses.
   * **Cross-Trial Isolation**: Token generation IDs (`activeTrialToken`) cancel and ignore any orphaned callbacks from aborted or prior trials.

---

### 2. High-Precision Timing Architecture

```text
               Participant Browser Runtime
                            │
               ┌────────────▼─────────────┐
               │    Timing Controller     │
               │                          │
               │  - performance.now()     │
               │  - requestAnimationFrame │
               │  - visibility monitoring │
               │  - input event latching  │
               └────────────┬─────────────┘
                            │
                            │ Submit Response (RT, Telemetry)
                            ▼
                   Phase 3 Execution API
               (POST .../trials/:id/response)
                            │
                            ▼
                     Session Service
                            │
                            ▼
                   PostgreSQL Database
```

* **Phase 3 Role**: Answers *Which trial should execute next?* (State progression, trial payloads, answer stripping, session persistence).
* **Phase 4 Role**: Answers *When was the stimulus presented and when did the participant respond?* (Frame synchronization, elapsed latency, input latching).

---

### 3. Timing State Lifecycle

```text
[IDLE]
   ↓ startTrial()
[PRE_STIMULUS] (Fixation rendered; premature keys rejected)
   ↓ preStimulusDelayMs expires
[STIMULUS_PENDING_PRESENTATION] (Stimulus mounted in DOM; JS scheduling phase)
   ↓ requestAnimationFrame() callback fires
[STIMULUS_PRESENTED] (Presentation timestamp latched at display frame)
   ↓
[AWAITING_RESPONSE] (Input listener activated; timeout timer scheduled)
   ├── Keypress detected ──▶ [RESPONSE_CAPTURED] ──▶ [COMPLETE]
   └── Timeout expires   ──▶ [TIMEOUT]           ──▶ [COMPLETE]
```

---

### 4. Timestamp Semantics & Data Contract

| Metric | Source API | Semantics |
| :--- | :--- | :--- |
| `stimulusPresentationTimestamp` | `performance.now()` in `requestAnimationFrame` | High-resolution timestamp at which the browser rendered the stimulus frame. |
| `responseTimestamp` | `performance.now()` in `keydown` handler | High-resolution timestamp captured upon the participant's first valid keypress. |
| `reactionTimeMs` | `responseTimestamp - stimulusPresentationTimestamp` | Pure elapsed interval in milliseconds. `null` if timed out. |
| `hardwarePrecision.timingMethod` | Static `'requestAnimationFrame'` | Presentation synchronization mechanism. |
| `hardwarePrecision.displayRefreshRateEstimateHz` | Multi-frame `requestAnimationFrame` sampling | Estimated display refresh rate (e.g., 60 Hz, 120 Hz, 144 Hz). |
| `hardwarePrecision.hiddenTabDetected` | `document.visibilityState === 'hidden'` | Flags whether timer throttling may have compromised measurement accuracy. |

---

### 5. Web Timing Limitations & Defensible Claims

* **What the Engine Guarantees**:
  * Frame-synchronized presentation boundary minimizing JavaScript execution jitter.
  * Monotonic, high-resolution reaction time interval calculation via `performance.now()`.
  * Deterministic trial lifecycle isolation and suppression of duplicate/anticipatory responses.
  * Comprehensive hardware and visibility telemetry for retrospective data auditing.
* **What Web Browsers Cannot Guarantee**:
  * **Photon Emission Latency**: Display panels (LCD/OLED) introduce pixel response time (1–15ms) and display scanout delays that cannot be detected by browser JavaScript.
  * **Input Hardware Latency**: Operating system USB polling intervals (typically 125Hz–1000Hz) and keyboard matrix debounce add hardware-dependent latency (4–16ms).
  * **Background Throttling**: Hidden tabs throttle timer resolution to >= 1000ms.
* **Defensible Phrasing**:
  *"The platform uses browser high-resolution timing APIs (`performance.now()`) and frame-synchronized presentation (`requestAnimationFrame`) to minimize timing uncertainty within the constraints of a web environment."*

---

### 6. Deliverables & Verification Checklist

- [x] **Timing Engine Module (`src/timing/`)**:
  - [x] `src/timing/timing-types.ts`: State definitions, trial inputs, timing result contracts.
  - [x] `src/timing/timing-controller.ts`: Frame-synchronized controller with full lifecycle.
  - [x] `src/timing/timing-diagnostics.ts`: Diagnostic accumulator and statistical summary engine.
  - [x] `src/timing/index.ts`: Barrel exports.
- [x] **Standalone Browser PoC**:
  - [x] `public/timing-poc.html`: Self-contained, responsive browser application for running manual and automated 50+ trial verification sessions.
  - [x] Mounted in `src/server/app.ts` (`/timing-poc` and static `/public`).
- [x] **Automated Test Suite (`tests/timing-engine.test.ts`)**:
  - [x] Test 1: Stimulus timestamp established on frame boundary.
  - [x] Test 2: Response timestamp and elapsed reaction time calculation.
  - [x] Test 3: Early response rejection during pre-stimulus fixation.
  - [x] Test 4: Duplicate response suppression (only first valid press captured).
  - [x] Test 5: Timeout handling and transition.
  - [x] Test 6: Stimulus duration enforcement.
  - [x] Test 7: Trial isolation and stale callback immunity.
  - [x] Test 8: 50 sequential trials execution.
  - [x] Total automated tests: **42/42 tests passing** (4 test suites).
- [x] **50+ Trial Verification Script (`scripts/verify-timing-poc.ts`)**:
  - [x] Successfully executed 50 trials with observed telemetry:
    - 50 trials completed
    - 48 responses captured
    - 2 timeouts correctly captured
    - Mean RT: 263.813 ms, Min RT: 208.219 ms, Max RT: 318.270 ms
    - Display refresh rate: ~59 Hz (16.95 ms frame delta)
- [x] **Boundary Guardrails**:
  - [x] Zero timing logic in `src/engine/` (Phase 3 preserved).
  - [x] Zero randomization algorithms (Phase 6 deferred).
  - [x] Zero conditional branching evaluation (Phase 7 deferred).
  - [x] Zero authentication / RBAC (Phase 8 deferred).
  - [x] Zero researcher persistent results analytics or dashboards (Phase 5 deferred).
  - [x] Zero external timing libraries added (native Web APIs only).
  - [x] Zero database migrations required.

---

### Final Phase 4 Verification Status

**Phase 4 Status: COMPLETE & VERIFIED**
