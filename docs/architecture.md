# Manova Labs — Architecture Specification & Data Contracts

## 1. System Vision & Problem Statement

Manova Labs is a Software-as-a-Service (SaaS) platform built to democratize behavioral and cognitive science research. By delivering a web-based, no-code/low-code experiment authoring environment backed by a millisecond-precision timing and execution engine, Manova Labs enables researchers to replicate the laboratory-grade precision of psychophysical software (e.g., PsychoPy, E-Prime) within standard web browsers.

The system serves two fundamentally different classes of users:
1. **Researchers**: Authenticated users who design, configure, validate, publish, and monitor behavioral experiments.
2. **Participants**: Anonymous subjects who access published experiments through secure, shareable links, interacting via a distraction-free, privacy-preserving browser runtime without creating accounts or revealing personally identifiable information (PII).

---

## 2. Core Entity Modeling & Categorization

To avoid conflation between authored parameters, runtime states, and collected empirical evidence, all platform entities are strictly partitioned into three fundamental data categories:
- **EXPERIMENT CONFIGURATION**: Authored by the researcher during design time; becomes strictly immutable once published.
- **RUNTIME / SESSION DATA**: Ephemeral state management data generated when a participant initiates and advances through an experimental session.
- **RESULT DATA**: Empirical measurements, timestamps, accuracy evaluations, and hardware telemetry recorded upon participant action.

```
+--------------------------------------------------------------------------+
|                        EXPERIMENT CONFIGURATION                          |
|  [Experiment] 1 ─── owns ───* [Trial] 1 ─── owns ─── 1 [Stimulus]         |
|                                     1 ─── owns ─── 1 [Expected Response] |
+--------------------------------------------------------------------------+
                                     │
                        instantiates / snapshots
                                     ▼
+------------------------------------+-------------------------------------+
|       RUNTIME / SESSION DATA       |             RESULT DATA             |
|  [Session]                         |  [Participant Response]             |
|  - participantId (anonymous)       |  - submittedResponse                |
|  - snapshotId & version            |  - reactionTimeMs                   |
|  - currentTrialId & progression    |  - timingMeasurement telemetry      |
+------------------------------------+-------------------------------------+
```

---

### 2.1 Entity Specifications

#### Entity: Researcher
* **Category**: USER & AUTHENTICATION
* **Purpose**: Represents an authenticated researcher account that designs, creates, owns, publishes, and reviews experimental studies and empirical results.
* **Who Creates It**: Self-service via registration (`POST /api/v1/auth/register`).
* **Lifecycle Phase**: Account creation, active usage, authentication via JWT.
* **Relationships**:
  * Owns zero or more `Experiment` entities (1-to-many composition with cascade delete).
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique identifier.
  * `email` (`string`): Unique lowercase email address.
  * `passwordHash` (`string`): Salted bcrypt password hash (never returned via API or token).
  * `createdAt` (`string`, ISO 8601): Account creation timestamp.
  * `updatedAt` (`string`, ISO 8601): Profile update timestamp.
* **Optional Fields**:
  * `name` (`string | null`): Display name of the researcher.

---

#### Entity: AuditLog
* **Category**: SECURITY & AUDIT
* **Purpose**: Records immutable historical audit logs for critical researcher actions (registration, login success/failure, experiment lifecycle transitions).
* **Who Creates It**: Backend services automatically upon researcher action.
* **Lifecycle Phase**: Written at event occurrence; append-only and immutable.
* **Relationships**:
  * Optionally references `researcherId` (nullable to accommodate unauthenticated or failed login attempts).
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique identifier.
  * `eventType` (`string`): Event type descriptor (`RESEARCHER_REGISTERED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `EXPERIMENT_CREATED`, `EXPERIMENT_UPDATED`, `EXPERIMENT_PUBLISHED`, `EXPERIMENT_DELETED`).
  * `createdAt` (`string`, ISO 8601): Event occurrence timestamp.
* **Optional Fields**:
  * `researcherId` (`string | null`, UUIDv4): Identifier of the researcher if authenticated.
  * `resourceId` (`string | null`, UUIDv4): Identifier of the affected experiment if applicable.
  * `metadata` (`object | null`): Safe contextual JSON data (passwords, hashes, and tokens are strictly prohibited).

---

#### Entity: Experiment
* **Category**: EXPERIMENT CONFIGURATION
* **Purpose**: Represents the root study definition, containing global parameters, researcher ownership, metadata, and the sequence of trials.
* **Who Creates It**: Researcher.
* **Lifecycle Phase**: Created at Design-time (DRAFT), frozen at Publish-time (PUBLISHED).
* **Relationships**:
  * Owns one or more `Trial` entities (1-to-many composition).
  * Referenced by zero or more `Session` entities.
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique identifier.
  * `title` (`string`): Non-empty human-readable experiment title.
  * `description` (`string`): Description of the study hypothesis and procedure.
  * `status` (`'DRAFT' | 'PUBLISHED'`): Current lifecycle state.
  * `version` (`number`): Monotonically increasing version integer (starts at 1).
  * `ownerResearcherId` (`string`, UUIDv4): Identifier of the researcher account that created and owns the experiment.
  * `publicSlug` (`string`): URL-safe unique alphanumeric slug for participant access links.
  * `config` (`object`): Display settings:
    * `displayMode` (`'fullscreen' | 'windowed'`)
    * `backgroundColor` (`string`, Hex/CSS color)
    * `allowPause` (`boolean`)
    * `showFeedback` (`boolean`)
  * `trials` (`Trial[]`): Non-empty ordered array of trials.
  * `createdAt` (`string`, ISO 8601): Creation timestamp.
  * `updatedAt` (`string`, ISO 8601): Last update timestamp.
* **Optional Fields**:
  * `generalInstructions` (`string | null`): Welcome and instructional text presented to participants prior to the first trial.
  * `completionMessage` (`string | null`): Debriefing or completion message displayed after the final trial.
  * `publishedAt` (`string | null`, ISO 8601): Timestamp of publication; `null` while in `DRAFT`.

---

#### Entity: Trial
* **Category**: EXPERIMENT CONFIGURATION
* **Purpose**: Defines an atomic unit of presentation, timing, stimulus delivery, and response expectations.
* **Who Creates It**: Researcher.
* **Lifecycle Phase**: Design-time; frozen once parent experiment is published.
* **Relationships**:
  * Belongs to an `Experiment`.
  * Owns exactly one `Stimulus` entity.
  * Owns exactly one `ExpectedResponse` entity.
  * References the next `Trial` via `nextTrialId`.
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique identifier.
  * `orderIndex` (`number`): 1-based sequential index.
  * `stimulus` (`Stimulus`): The sensory perceptual object to display.
  * `timingConfig` (`object`): Trial temporal parameters (see Section 4).
  * `expectedResponse` (`ExpectedResponse`): Definition of permissible and correct responses.
  * `nextTrialId` (`string | null`, UUIDv4): Pointer to the subsequent trial (`null` indicates terminal trial).
* **Optional Fields**:
  * `label` (`string | null`): Human-readable internal label for researcher reference (e.g., "Congruent Stroop Trial 4").
  * `instructions` (`string | null`): Contextual instructions specific to this trial.
  * `fixation` (`object | null`): Fixation cross configuration:
    * `enabled` (`boolean`)
    * `durationMs` (`number`)
    * `symbol` (`string`, e.g., `"+"`)
    * `color` (`string`, CSS color)
    * `fontSize` (`string`, CSS size)
  * `branching` (`TrialBranchingRule | null`): Seam for conditional progression rules (see Section 5).

---

#### Entity: Stimulus
* **Category**: EXPERIMENT CONFIGURATION
* **Purpose**: Defines the sensory payload (visual text, visual image, and future auditory/video stimuli) delivered during a trial.
* **Who Creates It**: Researcher.
* **Lifecycle Phase**: Design-time; immutable upon experiment publication.
* **Relationships**:
  * Belongs to a single `Trial`.
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique identifier.
  * `type` (`'text' | 'image' | 'audio' | 'video'`): Discriminating type union tag.
* **Type-Specific Required Fields**:
  * When `type === 'text'`:
    * `content` (`string`): The text string to render.
  * When `type === 'image'`:
    * `url` (`string`): Valid URI/URL to the image asset.
* **Optional Fields**:
  * `styling` (`object`): CSS-compatible rendering hints:
    * For text: `fontSize`, `fontWeight`, `color`, `fontFamily`, `textAlign`.
    * For image: `width`, `height`, `objectFit`, `border`.
  * `metadata` (`Record<string, unknown>`): Arbitrary researcher annotations (e.g., stimulus condition codes, valence ratings).

---

#### Entity: Expected Response
* **Category**: EXPERIMENT CONFIGURATION
* **Purpose**: Specifies admissible input modalities, allowable keys/buttons, and correctness criteria for a trial.
* **Who Creates It**: Researcher.
* **Lifecycle Phase**: Design-time.
* **Relationships**:
  * Belongs to a single `Trial`.
* **Required Fields**:
  * `type` (`'keypress' | 'button_click'`): Response input modality.
  * `evaluationMode` (`'exact_match' | 'none'`): Whether accuracy evaluation is automated (`exact_match`) or absent/exploratory (`none`).
* **Type-Specific Fields**:
  * When `type === 'keypress'`:
    * `allowedKeys` (`string[]`): Array of standard KeyboardEvent `code` values (e.g., `["Space", "KeyF", "KeyJ"]`).
  * When `type === 'button_click'`:
    * `allowedButtons` (`string[]`): Array of allowable button identifier strings.
* **Optional Fields**:
  * `correctResponse` (`string | null`): The expected ground-truth input value (e.g., `"Space"`); `null` if exploratory or free response.

---

#### Entity: Participant Response
* **Category**: RESULT DATA
* **Purpose**: Records the empirical behavioral measurement submitted by a participant for a single trial, including response value, reaction latency, accuracy classification, and hardware telemetry.
* **Who Creates It**: Participant action via client-side Execution Engine, processed by Server.
* **Lifecycle Phase**: Runtime (generated immediately following participant input or timeout).
* **Relationships**:
  * Belongs to a `Session`.
  * References the specific `Trial` executed.
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique response identifier.
  * `sessionId` (`string`, UUIDv4): Identifier of the active participant session.
  * `trialId` (`string`, UUIDv4): Identifier of the trial being responded to.
  * `submittedResponse` (`string | null`): The actual key code or button clicked; `null` if trial timed out.
  * `isCorrect` (`boolean | null`): Ground-truth evaluation result; `null` if `evaluationMode === 'none'`.
  * `reactionTimeMs` (`number | null`): Calculated reaction time latency in milliseconds; `null` if timed out.
  * `timedOut` (`boolean`): `true` if the participant failed to respond within `responseTimeoutMs`.
  * `timingMeasurement` (`TimingMeasurement | null`): Detailed hardware telemetry (see Section 4).
  * `clientMetadata` (`ClientDeviceMetadata`): Environmental snapshot:
    * `userAgent` (`string`)
    * `screenResolution` (`string`)
    * `viewportSize` (`string`)
    * `devicePixelRatio` (`number`)
  * `submittedAt` (`string`, ISO 8601): Server ingestion timestamp.

---

#### Entity: Session
* **Category**: RUNTIME / SESSION DATA
* **Purpose**: Tracks an active or completed experiment run conducted by an anonymous participant.
* **Who Creates It**: Participant (via anonymous session initialization endpoint).
* **Lifecycle Phase**: Runtime.
* **Relationships**:
  * References an `Experiment` by ID, version, and snapshot ID.
  * Owns zero or more `ParticipantResponse` entities.
* **Required Fields**:
  * `id` (`string`, UUIDv4): Globally unique session identifier.
  * `experimentId` (`string`, UUIDv4): Identifier of the parent experiment.
  * `experimentVersion` (`number`): The specific integer version locked at session creation.
  * `experimentSnapshotId` (`string`): Immutable snapshot reference guaranteeing the trial sequence remains static throughout the session.
  * `participantId` (`string`): Anonymous participant identifier (prefixed UUID, e.g., `part_anon_...`).
  * `status` (`'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'`): Current session state.
  * `currentTrialIndex` (`number`): 0-based index of the active trial.
  * `totalTrials` (`number`): Total count of trials in the snapshotted sequence.
  * `startedAt` (`string`, ISO 8601): Session start timestamp.
  * `clientEnvironment` (`object`): Client environment summary (browser, OS, screen resolution).
* **Optional Fields**:
  * `currentTrialId` (`string | null`, UUIDv4): Pointer to active trial ID; `null` when status is `COMPLETED`.
  * `completedAt` (`string | null`, ISO 8601): Session finish timestamp.

---

## 3. Concrete Schema Examples

The examples below are canonical and byte-for-byte consistent with their standalone files in `docs/examples/`.

### 3.1 Stimulus Example (`docs/examples/stimulus.example.json`)
```json
{
  "id": "stim_8f9a2b1c-3d4e-4f5a-b6c7-d8e9f01a2b3c",
  "type": "text",
  "content": "X",
  "styling": {
    "fontSize": "48px",
    "fontWeight": "bold",
    "color": "#1E293B",
    "fontFamily": "Inter, sans-serif"
  },
  "metadata": {
    "label": "Target Letter Stimulus"
  }
}
```

### 3.2 Expected Response Example (`docs/examples/expected-response.example.json`)
```json
{
  "type": "keypress",
  "allowedKeys": [
    "Space"
  ],
  "correctResponse": "Space",
  "evaluationMode": "exact_match"
}
```

### 3.3 Trial Example (`docs/examples/trial.example.json`)
```json
{
  "id": "trial_4a5b6c7d-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
  "orderIndex": 1,
  "label": "Trial 1 - Congruent Target",
  "instructions": "Press the SPACEBAR as rapidly as possible when you see the letter X appear.",
  "fixation": {
    "enabled": true,
    "durationMs": 750,
    "symbol": "+",
    "color": "#64748B",
    "fontSize": "32px"
  },
  "stimulus": {
    "id": "stim_8f9a2b1c-3d4e-4f5a-b6c7-d8e9f01a2b3c",
    "type": "text",
    "content": "X",
    "styling": {
      "fontSize": "48px",
      "fontWeight": "bold",
      "color": "#1E293B",
      "fontFamily": "Inter, sans-serif"
    }
  },
  "timingConfig": {
    "preStimulusDelayMs": 750,
    "stimulusDurationMs": 2000,
    "responseTimeoutMs": 3000,
    "allowEarlyResponse": false,
    "waitForResponse": false
  },
  "expectedResponse": {
    "type": "keypress",
    "allowedKeys": [
      "Space"
    ],
    "correctResponse": "Space",
    "evaluationMode": "exact_match"
  },
  "nextTrialId": "trial_5b6c7d8e-9f0a-4b2c-3d4e-5f6a7b8c9d0e",
  "branching": null
}
```

### 3.4 Experiment Example (`docs/examples/experiment.example.json`)
```json
{
  "id": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "title": "Simple Visual Reaction Time Study",
  "description": "Measures human baseline motor response latency to visual focal stimuli.",
  "status": "PUBLISHED",
  "version": 1,
  "ownerResearcherId": "res_9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
  "publicSlug": "visual-rt-baseline",
  "generalInstructions": "In this experiment, you will observe a central fixation cross (+) followed by a stimulus letter. Press the Spacebar as fast as you can once the stimulus appears.",
  "completionMessage": "Thank you for participating! Your responses have been anonymously recorded.",
  "config": {
    "displayMode": "fullscreen",
    "backgroundColor": "#F8FAFC",
    "allowPause": false,
    "showFeedback": true
  },
  "trials": [
    {
      "id": "trial_4a5b6c7d-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
      "orderIndex": 1,
      "label": "Trial 1 - Target X",
      "instructions": null,
      "fixation": {
        "enabled": true,
        "durationMs": 750,
        "symbol": "+",
        "color": "#64748B",
        "fontSize": "32px"
      },
      "stimulus": {
        "id": "stim_8f9a2b1c-3d4e-4f5a-b6c7-d8e9f01a2b3c",
        "type": "text",
        "content": "X",
        "styling": {
          "fontSize": "48px",
          "fontWeight": "bold",
          "color": "#1E293B",
          "fontFamily": "Inter, sans-serif"
        }
      },
      "timingConfig": {
        "preStimulusDelayMs": 750,
        "stimulusDurationMs": 2000,
        "responseTimeoutMs": 3000,
        "allowEarlyResponse": false,
        "waitForResponse": false
      },
      "expectedResponse": {
        "type": "keypress",
        "allowedKeys": [
          "Space"
        ],
        "correctResponse": "Space",
        "evaluationMode": "exact_match"
      },
      "nextTrialId": "trial_5b6c7d8e-9f0a-4b2c-3d4e-5f6a7b8c9d0e",
      "branching": null
    },
    {
      "id": "trial_5b6c7d8e-9f0a-4b2c-3d4e-5f6a7b8c9d0e",
      "orderIndex": 2,
      "label": "Trial 2 - Target O",
      "instructions": null,
      "fixation": {
        "enabled": true,
        "durationMs": 500,
        "symbol": "+",
        "color": "#64748B",
        "fontSize": "32px"
      },
      "stimulus": {
        "id": "stim_9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d",
        "type": "text",
        "content": "O",
        "styling": {
          "fontSize": "48px",
          "fontWeight": "bold",
          "color": "#1E293B",
          "fontFamily": "Inter, sans-serif"
        }
      },
      "timingConfig": {
        "preStimulusDelayMs": 500,
        "stimulusDurationMs": 2000,
        "responseTimeoutMs": 3000,
        "allowEarlyResponse": false,
        "waitForResponse": false
      },
      "expectedResponse": {
        "type": "keypress",
        "allowedKeys": [
          "Space"
        ],
        "correctResponse": "Space",
        "evaluationMode": "exact_match"
      },
      "nextTrialId": null,
      "branching": null
    }
  ],
  "createdAt": "2026-09-26T10:00:00.000Z",
  "updatedAt": "2026-09-26T10:15:00.000Z",
  "publishedAt": "2026-09-26T10:15:00.000Z"
}
```

### 3.5 Participant Response Example (`docs/examples/participant-response.example.json`)
```json
{
  "id": "resp_3d4e5f6a-7b8c-4d1e-2f3a-4b5c6d7e8f9a",
  "sessionId": "sess_7c8d9e0f-1a2b-4c3d-5e6f-7a8b9c0d1e2f",
  "trialId": "trial_4a5b6c7d-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
  "submittedResponse": "Space",
  "isCorrect": true,
  "reactionTimeMs": 242.35,
  "timedOut": false,
  "timingMeasurement": {
    "stimulusOnsetTimestamp": 1727337600750.2,
    "responseTimestamp": 1727337600992.55,
    "calculatedLatencyMs": 242.35,
    "hardwarePrecision": {
      "timingMethod": "requestAnimationFrame",
      "displayRefreshRateEstimateHz": 60,
      "hiddenTabDetected": false,
      "preStimulusActualDurationMs": 750.15
    }
  },
  "clientMetadata": {
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "screenResolution": "1920x1080",
    "viewportSize": "1440x900",
    "devicePixelRatio": 2
  },
  "submittedAt": "2026-09-26T10:30:00.993Z"
}
```

### 3.6 Session Example (`docs/examples/session.example.json`)
```json
{
  "id": "sess_7c8d9e0f-1a2b-4c3d-5e6f-7a8b9c0d1e2f",
  "experimentId": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "experimentVersion": 1,
  "experimentSnapshotId": "snap_1a2b3c4d-v1",
  "participantId": "part_anon_f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "IN_PROGRESS",
  "currentTrialId": "trial_4a5b6c7d-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
  "currentTrialIndex": 0,
  "totalTrials": 2,
  "startedAt": "2026-09-26T10:30:00.000Z",
  "completedAt": null,
  "clientEnvironment": {
    "browser": "Chrome",
    "os": "macOS",
    "screenResolution": "1920x1080",
    "devicePixelRatio": 2
  }
}
```

---

## 4. Timing Configuration & Measurement Data Contract

### 4.1 Configured Timing vs. Measured Timing
A fundamental principle of cognitive science instrumentation is that **intended timing is never identical to realized timing**. In web browser environments, hardware, operating system scheduler ticks, display refresh intervals, and JavaScript event loop turns introduce jitter. 

Therefore, Manova Labs strictly separates:
1. **Configured Timing (`timingConfig`)**: What the researcher instructed the experiment to do.
2. **Measured Timing (`timingMeasurement`)**: What the client timing engine empirically captured via high-resolution clocks.

```
Configured: [ Pre-Stimulus Delay: 750ms ] ──▶ [ Stimulus Onset: Max 2000ms ] ──▶ [ Timeout: 3000ms ]
                                                          │
                                                          ▼ (Participant Press)
Measured:   [ Actual Delay: 750.15ms    ] ──▶ [ Stimulus Onset: T0 ] ──────────▶ [ RT: 242.35ms ]
```

### 4.2 Configured Timing Contract (on `Trial.timingConfig`)
* `preStimulusDelayMs` (`number`): Duration of blank/fixation screen preceding stimulus onset.
* `stimulusDurationMs` (`number | null`): How long the stimulus remains visible. If `null`, it persists until response or timeout.
* `responseTimeoutMs` (`number | null`): Upper window for participant response. If `null`, the trial waits indefinitely.
* `allowEarlyResponse` (`boolean`): If `true`, responses during pre-stimulus delay are recorded; if `false`, premature presses are either ignored or marked as anticipatory errors.
* `waitForResponse` (`boolean`): If `true`, trial will not advance until an admissible key is pressed, overriding `responseTimeoutMs`.

### 4.3 Measured Timing Contract (on `ParticipantResponse.timingMeasurement`)
* `stimulusOnsetTimestamp` (`number`): High-resolution DOMHighResTimeStamp (`performance.now()`) aligned to the display vsync cycle via `requestAnimationFrame`.
* `responseTimestamp` (`number`): `event.timeStamp` captured from the browser input event listener.
* `calculatedLatencyMs` (`number`): `responseTimestamp - stimulusOnsetTimestamp`.
* `hardwarePrecision` (`object`):
  * `timingMethod` (`'requestAnimationFrame' | 'performanceNow' | 'fallback'`): Method used to verify visual render.
  * `displayRefreshRateEstimateHz` (`number | null`): Inferred display refresh rate (e.g., 60Hz, 120Hz, 144Hz).
  * `hiddenTabDetected` (`boolean`): Flags if `document.visibilityState === 'hidden'` occurred during the trial, causing browser timer throttling.
  * `preStimulusActualDurationMs` (`number`): Realized duration of the fixation interval.

### 4.4 Known Sources of Web Timing Variability
* **Display Refresh Granularity**: Screen updates occur only on discrete frame boundaries (e.g., 16.67ms at 60Hz; 6.94ms at 144Hz). Stimulus onset is bound by the next v-blank signal.
* **Background Tab Throttling**: Browsers aggressively de-prioritize background tabs, clamping `setTimeout` to >= 1000ms and throttling `requestAnimationFrame`. The engine records tab visibility to allow filtering compromised trials.
* **Garbage Collection (GC) Pauses**: Major GC cycles can block the main thread for 5–20ms. The engine avoids allocating objects in the critical timing path.

---

## 5. Trial Progression & The Branching Seam

### 5.1 MVP Progression: Linear Sequence
In the MVP slice, trial progression is strictly sequential:
$$\text{Trial } 1 \longrightarrow \text{Trial } 2 \longrightarrow \text{Trial } 3 \longrightarrow \text{Complete}$$

However, to avoid forcing Phase 2 and Phase 3 to rely on fragile array indexing, every `Trial` has an explicit `nextTrialId` pointer. The terminal trial defines `"nextTrialId": null`.

### 5.2 Seam for Future Conditional Branching (Phase 7)
Each `Trial` contains a reserved optional field:
```json
"branching": {
  "conditions": [
    {
      "operator": "equals",
      "field": "isCorrect",
      "value": true,
      "targetTrialId": "trial_correct_path_uuid"
    },
    {
      "operator": "greater_than",
      "field": "reactionTimeMs",
      "value": 1000,
      "targetTrialId": "trial_slow_warning_uuid"
    }
  ],
  "defaultNextTrialId": "trial_fallback_uuid"
}
```
* In the MVP, `branching` is set to `null`.
* When Phase 7 introduces the Conditional Branching Engine, the runtime will first evaluate `branching.conditions` in order; if any condition matches against the recorded response, it jumps to `targetTrialId`. If none match, it falls back to `defaultNextTrialId` or `nextTrialId`.
* **Architectural Guarantee**: This architectural seam guarantees zero schema breakage or data migration when conditional branching is implemented.

---

## 6. Execution Concepts & State Model (Documentation Only)

The client-side Execution Engine (Phase 3) will execute each trial through the following finite lifecycle:

```
[instruction] ──▶ [trial] ──▶ [stimulus] ──▶ [awaiting-response] ──▶ [response-recorded] ──▶ [next-trial] ──▶ [complete]
```

### State-to-Schema Mapping:
1. `instruction`: Displays `experiment.generalInstructions` or `trial.instructions`. Awaiting participant confirmation to commence.
2. `trial`: Initialized using `trial.timingConfig.preStimulusDelayMs` and `trial.fixation`. Fixation symbol is rendered.
3. `stimulus`: Fixation clears; `trial.stimulus` is mounted. Stimulus onset time is latched using `requestAnimationFrame`.
4. `awaiting-response`: Input listeners activate according to `trial.expectedResponse.allowedKeys`. A timer tracks `trial.timingConfig.responseTimeoutMs`.
5. `response-recorded`: Keypress detected or timeout fired. `timingMeasurement` is constructed; correctness evaluated against `trial.expectedResponse.correctResponse`.
6. `next-trial`: Execution engine determines subsequent trial via `trial.branching` or `trial.nextTrialId`.
7. `complete`: When `nextTrialId === null`, the session terminates and presents `experiment.completionMessage`.

---

## 7. Experiment Lifecycle & Versioning Strategy

### 7.1 Lifecycle States: DRAFT vs. PUBLISHED

| Capability | DRAFT | PUBLISHED |
| :--- | :--- | :--- |
| Can edit title, description, instructions | Yes | No (requires new draft/version) |
| Can add, reorder, or delete trials | Yes | No |
| Can modify stimulus styling or timings | Yes | No |
| Accessible by anonymous participants | No (rejected with `EXPERIMENT_NOT_PUBLISHED`) | Yes (via public slug/URL) |
| Active Session creation allowed | No | Yes |
| Results data accepted | No | Yes |

* **Publication Process**: A researcher invokes `POST /experiments/:id/publish`. The backend validates all trials, stimuli, and progression references. Upon passing, the experiment status changes to `PUBLISHED`, `version` is finalized, `publishedAt` is recorded, and an immutable snapshot is created.
* **Validation Rejection**: If an experiment contains broken links (`nextTrialId` pointing to non-existent trial), empty trial lists, or invalid timing, publishing is aborted with HTTP 400 and a structured `VALIDATION_ERROR`.

### 7.2 Hackathon-Appropriate Versioning & Snapshot Strategy
* **The Problem**: A researcher publishes an experiment. 50 participants start sessions. The researcher decides to alter a stimulus duration. In-flight participants must not have their experiment definition mutate mid-run.
* **The Solution**:
  1. When an experiment is published, the backend generates an immutable JSON snapshot identified by `snap_<experimentId>_v<version>`.
  2. When a participant initializes a session via `POST /participant/sessions`, the created `Session` entity locks in both `experimentVersion` and `experimentSnapshotId`.
  3. All trial delivery and validation for that session are served strictly from the snapshot.
  4. If a researcher edits a published experiment, the system automatically duplicates the definition into a new `DRAFT` revision with an incremented version number (`v2`), leaving `v1` and its active sessions untouched.
* **Known Limitation**: Live mid-session migrations are explicitly out of scope for the hackathon.

---

## 8. Identifier (ID) Strategy

All internal database entities use standard **UUIDv4** strings, optionally prefixed for clear operational debugging:
* Experiments: `exp_<uuid>`
* Trials: `trial_<uuid>`
* Stimuli: `stim_<uuid>`
* Participant Responses: `resp_<uuid>`
* Sessions: `sess_<uuid>`
* Anonymous Participants: `part_anon_<uuid>`

### Rationale:
* **UUIDv4**: Database-agnostic, globally unique, eliminates cross-entity collision, and allows decentralized ID generation without database sequence bottlenecks.
* **Client vs. Server Generation**:
  * **Experiment, Trial, Stimulus**: Generated on the **Server** during API persistence to ensure relational integrity.
  * **Session, Response**: Generated on the **Server** when participant requests are received.
  * **Public Slug**: Researcher-configurable, URL-friendly unique slug (e.g., `visual-rt-baseline`) for clean participant sharing.

---

## 9. MVP Reaction-Time Experiment Representation

The MVP experiment requested for the project slice is completely represented in:
[`docs/examples/mvp-reaction-time-experiment.example.json`](file:///Users/atharva/Documents/Hackathon/BitNBuild-CodeCrafters/docs/examples/mvp-reaction-time-experiment.example.json)

### Sequence Trace:
1. **Instruction**: General instructions explain the task and stimulus-key mappings.
2. **Trial 1**:
   * Pre-stimulus fixation: 800ms (`+`, `#94A3B8`).
   * Stimulus: Text `"GREEN"`, `#10B981`.
   * Expected: Keypress `"KeyG"`.
   * Next trial: Points to Trial 2.
3. **Trial 2**:
   * Pre-stimulus fixation: 600ms (`+`, `#94A3B8`).
   * Stimulus: Text `"RED"`, `#EF4444`.
   * Expected: Keypress `"KeyR"`.
   * Next trial: Points to Trial 3.
4. **Trial 3**:
   * Pre-stimulus fixation: 750ms (`+`, `#94A3B8`).
   * Stimulus: Text `"BLUE"`, `#3B82F6`.
   * Expected: Keypress `"KeyB"`.
   * Next trial: `null` (Terminal trial).
5. **Complete**: Displays completion debriefing message.

**Generalization Verification**: Any new researcher experiment with custom stimuli (e.g., visual Stroop, Flanker task, lexical decision task) can be authored using this exact schema without modifying a single line of backend logic.

---

## 10. Architecture Decisions

### Experiment representation
* **Decision**: Represent experiments as a top-level composite object owning global display configuration and an ordered array of Trial objects.
* **Reason**: Decouples study metadata from runtime execution while keeping the authored definition self-contained and easily exportable/importable.
* **Future extension**: Multi-block experiment structures (e.g., practice blocks, test blocks) grouped under an experiment container.

### Trial representation
* **Decision**: Model trials as discrete objects with dedicated `fixation`, `stimulus`, `timingConfig`, and `expectedResponse` sub-structures.
* **Reason**: Enforces clean boundaries between sensory presentation, temporal constraints, and behavioral validation.
* **Future extension**: Multi-stimulus trials (e.g., prime + probe, spatial cueing paradigms).

### Stimulus representation
* **Decision**: Use a discriminated union based on `"type": "text" | "image"` with extensible CSS-like styling properties.
* **Reason**: Allows seamless addition of media types without altering existing trial schemas or violating type safety.
* **Future extension**: Audio stimuli, canvas/WebGL shapes, and video playback with preloading metadata.

### Response representation
* **Decision**: Strictly isolate `ExpectedResponse` (configuration) from `ParticipantResponse` (runtime measurement result).
* **Reason**: Conflating what was expected with what was measured creates data ambiguity and complicates result aggregation.
* **Future extension**: Continuous responses (mouse tracking trajectories, eye tracking gaze coordinates, slider scales).

### Session representation
* **Decision**: Bind each session to an immutable snapshot ID and version number of the published experiment upon initiation.
* **Reason**: Ensures participant sessions are never corrupted or altered by concurrent researcher edits.
* **Future extension**: Session resumption tokens allowing participants to recover from network disconnects or page reloads.

### Timing representation
* **Decision**: Separate configured durations from high-resolution measured latency (`DOMHighResTimeStamp` / `requestAnimationFrame` telemetry).
* **Reason**: Web browser timing is inherently subject to display refresh intervals, OS jitter, and garbage collection pauses; researchers require transparency into measurement fidelity.
* **Future extension**: Client-side automated display refresh rate calibration and audio/visual onset validation.

### Trial progression
* **Decision**: Rely on explicit `nextTrialId` references instead of relying solely on array indices.
* **Reason**: Provides a deterministic pointer-based progression model that naturally accommodates branching and non-linear transitions.
* **Future extension**: Dynamic block shuffle progression and Latin-square counterbalancing.

### Future conditional branching seam
* **Decision**: Provide an optional `branching` object containing conditional rules and target trial IDs on each trial.
* **Reason**: Establishes the exact architectural seam for Phase 7 branching logic without requiring any schema refactoring.
* **Future extension**: Expression-based conditional evaluation engine supporting compound boolean expressions and adaptive psychophysics (e.g., staircase methods).

### Researcher vs. participant API separation
* **Decision**: Isolate researcher endpoints (`/experiments`) requiring authentication from participant endpoints (`/participant`) that operate anonymously using session IDs.
* **Reason**: Enforces security, participant anonymity, and IRB compliance at the architectural boundary.
* **Future extension**: Granular researcher role-based access control (RBAC) and lab collaboration workspaces.

### Publishing/lifecycle
* **Decision**: Implement a binary `DRAFT` / `PUBLISHED` state machine with mandatory automated validation during the publish transition.
* **Reason**: Prevents half-formed or broken experiment configurations from ever reaching participants.
* **Future extension**: `ARCHIVED` state for completed experiments to deprecate public links while preserving analytical datasets.

### IDs
* **Decision**: Standardize on UUIDv4 strings for all database entities, paired with custom human-readable slugs for experiment access URLs.
* **Reason**: Unambiguous, database-agnostic, collision-free, and safe for distributed systems.
* **Future extension**: Hash-based cryptographic verification IDs for auditable open-science result packages.

### Versioning/snapshotting
* **Decision**: Snapshot the entire experiment JSON at publication and lock active sessions to that snapshot ID.
* **Reason**: Pragmatic, hackathon-appropriate, and completely isolates active participants from draft revisions.
* **Future extension**: Incremental schema diffing and automated multi-version result migrations.

### Validation
* **Decision**: Specify rigorous validation rules in Phase 1 documentation to be enforced via Zod schemas in Phase 2.
* **Reason**: Ensures zero ambiguity between frontend expectations and backend persistence constraints.
* **Future extension**: Pre-flight linting in the visual builder providing real-time feedback to researchers.

### Error handling
* **Decision**: Standardize on a uniform JSON error payload: `{ "error": { "code": string, "message": string, "details"?: array } }`.
* **Reason**: Simplifies frontend error handling and provides machine-readable error codes.
* **Future extension**: Localized error messages and error tracing IDs correlated with server logs.

### Researcher authentication & ownership authorization (Phase 8)
* **Decision**: Enforce stateless JSON Web Token (JWT) authentication for all researcher operations and bind all experiment management actions to the authenticated researcher ID (`Experiment.ownerResearcherId`). Anonymous participants access published studies with zero accounts, zero cookies, and zero JWTs.
* **Reason**: Strict separation of concerns, institutional review board (IRB) ethical standards for human participant privacy, and prevention of cross-researcher data tampering. Returns `401 UNAUTHORIZED` for missing/invalid auth and `403 FORBIDDEN` for attempts to access or modify resources owned by other researchers.
* **Future extension**: Lab collaboration workspaces, granular organization-level role-based access control (RBAC), and session expiration refresh-token rotation (Phase 10+).

### Integration hardening & security controls (Phase 9)
* **Decision**: Implement defense-in-depth security controls around the existing API surface:
  1. **Rate Limiting**: Protect sensitive authentication endpoints against brute-force attacks via sliding window counters.
  2. **Security Headers**: Enforce standard HTTP headers (`nosniff`, `SAMEORIGIN`, `no-referrer`, CSP) via Helmet.
  3. **Production CORS**: Enforce strict origin whitelisting in production via `CORS_ORIGIN` while keeping development permissive.
  4. **CSRF Immunity**: Stateless Bearer token architecture eliminates CSRF risks without needing cookie tokens.
  5. **Audit Logging**: Persist immutable, sanitized audit records for all researcher account and experiment lifecycle events.
  6. **Configuration Validation**: Fail-fast on startup in production if weak/default secrets are present.
* **Reason**: Hardens the backend for production integration while preserving 100% of existing participant execution performance, timing fidelity, and anonymity.
* **Future extension**: Redis-backed distributed rate limiting, automated audit log archival, and centralized SIEM log shipping.



