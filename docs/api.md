# Manova Labs — REST API Contract

## 1. Architectural Boundaries & Security Posture

The Manova Labs API is strictly partitioned into two operational surfaces:
1. **Researcher API (`/api/v1/experiments`)**: Requires an authenticated researcher session. Enforces ownership access controls so researchers can only inspect, alter, or publish their own studies.
2. **Participant API (`/api/v1/participant`)**: Fully anonymous and public. Requires zero login, zero cookies, and zero participant accounts. All participant requests are authorized solely via an ephemeral `sessionId` issued at session initialization.

> [!IMPORTANT]
> This separation is an architectural and security boundary (to be strictly enforced in Phase 8 via authentication middleware and CORS policies). It guarantees participant anonymity, GDPR compliance, and adherence to Institutional Review Board (IRB) human-subject research protocols.

---

## 2. Global Error Contract

All error responses from the Manova Labs API adhere to a single, predictable JSON format:

```json
{
  "error": {
    "code": "EXPERIMENT_NOT_FOUND",
    "message": "The requested experiment does not exist.",
    "details": [
      {
        "field": "id",
        "message": "No experiment found matching ID 'exp_nonexistent'"
      }
    ]
  }
}
```

### Standard Error Codes & HTTP Status Mapping

| HTTP Status | Error Code | Description / Trigger Scenario |
| :--- | :--- | :--- |
| **400 Bad Request** | `INVALID_EXPERIMENT` | The experiment payload fails structural validation (e.g., missing required fields, negative timing values). |
| **400 Bad Request** | `INVALID_RESPONSE` | The participant's submitted response does not conform to the trial's expected input type (e.g., submitted an unauthorized key). |
| **401 Unauthorized** | `UNAUTHORIZED` | Missing, malformed, or expired researcher authentication token. |
| **403 Forbidden** | `FORBIDDEN` | Researcher attempts to read, edit, or delete an experiment owned by another researcher. |
| **404 Not Found** | `EXPERIMENT_NOT_FOUND` | No experiment exists with the provided ID or public slug. |
| **404 Not Found** | `SESSION_NOT_FOUND` | The provided `sessionId` does not match any active or completed session. |
| **404 Not Found** | `TRIAL_NOT_FOUND` | The trial requested or referenced does not exist within the session's experiment snapshot. |
| **409 Conflict** | `EXPERIMENT_NOT_PUBLISHED` | A participant attempts to access or start a session on a study that is in `DRAFT` status. (Status 409 is justified because the resource exists, but its current lifecycle state conflicts with participant execution). |
| **409 Conflict** | `EXPERIMENT_ALREADY_PUBLISHED` | Researcher attempts to republish or overwrite an already active published snapshot. |
| **409 Conflict** | `SESSION_ALREADY_COMPLETED` | Participant attempts to submit a response to a session that has already completed. |
| **422 Unprocessable**| `VALIDATION_ERROR` | Semantic validation failure during publishing (e.g., dangling `nextTrialId` reference). |
| **500 Server Error** | `INTERNAL_SERVER_ERROR`| Unhandled server-side failure. |

---

## 3. Validation Rules (Contract Specification)

Phase 2 backend services and validation middleware (e.g., Zod) must strictly enforce the following rules:

1. **Experiment Title**: Must be a non-empty string between 3 and 120 characters.
2. **Experiment Slug**: Must be unique, URL-safe alphanumeric string with hyphens (e.g., `^[a-z0-9-]+$`).
3. **Trial Non-Emptiness**: An experiment must contain at least 1 trial.
4. **Trial ID Uniqueness**: All `trial.id` values within an experiment must be unique UUIDs.
5. **Pointer Integrity**: Any non-null `nextTrialId` must resolve to an existing `trial.id` within the same experiment.
6. **Acyclic Terminal Path**: At least one trial must have `"nextTrialId": null` to represent experiment termination.
7. **Stimulus Validation**:
   - `text`: `content` must be a non-empty string.
   - `image`: `url` must be a valid, well-formed HTTP/HTTPS URL.
8. **Timing Rules**:
   - `preStimulusDelayMs` >= 0.
   - `stimulusDurationMs` must be > 0 or `null`.
   - `responseTimeoutMs` must be > 0 or `null`.
9. **Expected Response Validation**:
   - `keypress`: `allowedKeys` must be a non-empty array of valid keyboard key codes (e.g., `"Space"`, `"KeyF"`).
   - If `correctResponse` is provided, it must be contained in `allowedKeys`.
10. **Publishing Pre-conditions**: An experiment cannot transition to `PUBLISHED` if any of the above validation rules fail.
11. **Session Scope**: Participant responses are only accepted for the session's `currentTrialId`. Responses submitted out-of-order or for previously completed trials must be rejected with `INVALID_RESPONSE`.

---

## 4. Researcher Experiment API

**Base Path**: `/api/v1/experiments`  
**Authentication Assumption**: Requires standard `Authorization: Bearer <researcher_token>` header. (Phase 8 will supply the token; all endpoints assume the researcher identity is extracted from this token).

---

### 4.1 Create Experiment
Creates a new experiment in `DRAFT` status owned by the authenticated researcher.

* **Method**: `POST`
* **URL**: `/api/v1/experiments`
* **Request Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>`
* **Request Body Example**:
```json
{
  "title": "Simple Visual Reaction Time Study",
  "description": "Measures human baseline motor response latency to visual focal stimuli.",
  "publicSlug": "visual-rt-baseline",
  "generalInstructions": "Press the Spacebar as fast as you can once the stimulus appears.",
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
        "allowedKeys": ["Space"],
        "correctResponse": "Space",
        "evaluationMode": "exact_match"
      },
      "nextTrialId": null,
      "branching": null
    }
  ]
}
```
* **Success Response**: `201 Created`
```json
{
  "id": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "title": "Simple Visual Reaction Time Study",
  "description": "Measures human baseline motor response latency to visual focal stimuli.",
  "status": "DRAFT",
  "version": 1,
  "ownerResearcherId": "res_9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d",
  "publicSlug": "visual-rt-baseline",
  "createdAt": "2026-09-26T10:00:00.000Z",
  "updatedAt": "2026-09-26T10:00:00.000Z"
}
```
* **Error Responses**:
  * `400 Bad Request`: `{ "error": { "code": "INVALID_EXPERIMENT", "message": "Title must be at least 3 characters." } }`
  * `401 Unauthorized`: `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication token missing or invalid." } }`

---

### 4.2 List Researcher Experiments
Retrieves all experiments owned by the authenticated researcher.

* **Method**: `GET`
* **URL**: `/api/v1/experiments`
* **Request Headers**:
  * `Authorization: Bearer <token>`
* **Success Response**: `200 OK`
```json
{
  "experiments": [
    {
      "id": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "title": "Simple Visual Reaction Time Study",
      "status": "DRAFT",
      "version": 1,
      "publicSlug": "visual-rt-baseline",
      "trialCount": 1,
      "createdAt": "2026-09-26T10:00:00.000Z",
      "updatedAt": "2026-09-26T10:00:00.000Z"
    }
  ],
  "total": 1
}
```
* **Error Responses**:
  * `401 Unauthorized`: `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication token missing." } }`

---

### 4.3 Get Experiment by ID
Retrieves the full experiment definition including all trials and configuration.

* **Method**: `GET`
* **URL**: `/api/v1/experiments/:id`
* **Request Headers**:
  * `Authorization: Bearer <token>`
* **Success Response**: `200 OK`
*(Returns full Experiment entity as shown in `docs/examples/experiment.example.json`)*
* **Error Responses**:
  * `404 Not Found`: `{ "error": { "code": "EXPERIMENT_NOT_FOUND", "message": "Experiment 'exp_1a2b3c4d' not found." } }`
  * `403 Forbidden`: `{ "error": { "code": "FORBIDDEN", "message": "You do not own this experiment." } }`

---

### 4.4 Update Experiment
Modifies an existing `DRAFT` experiment definition. (If already `PUBLISHED`, updates create a new `DRAFT` revision).

* **Method**: `PUT`
* **URL**: `/api/v1/experiments/:id`
* **Request Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>`
* **Request Body Example**:
```json
{
  "title": "Simple Visual Reaction Time Study - Revised",
  "description": "Updated stimulus presentation parameters.",
  "publicSlug": "visual-rt-baseline"
}
```
* **Success Response**: `200 OK`
```json
{
  "id": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "title": "Simple Visual Reaction Time Study - Revised",
  "status": "DRAFT",
  "version": 1,
  "updatedAt": "2026-09-26T10:10:00.000Z"
}
```
* **Error Responses**:
  * `400 Bad Request`: `{ "error": { "code": "INVALID_EXPERIMENT", "message": "Validation failed." } }`
  * `404 Not Found`: `{ "error": { "code": "EXPERIMENT_NOT_FOUND", "message": "Experiment not found." } }`

---

### 4.5 Delete Experiment
Deletes an experiment. If sessions already exist for a published experiment, deletion soft-deletes or archives the record.

* **Method**: `DELETE`
* **URL**: `/api/v1/experiments/:id`
* **Request Headers**:
  * `Authorization: Bearer <token>`
* **Success Response**: `204 No Content`
* **Error Responses**:
  * `404 Not Found`: `{ "error": { "code": "EXPERIMENT_NOT_FOUND", "message": "Experiment not found." } }`
  * `403 Forbidden`: `{ "error": { "code": "FORBIDDEN", "message": "You do not own this experiment." } }`

---

### 4.6 Publish Experiment
Validates the experiment configuration, locks it into an immutable snapshot, and changes status to `PUBLISHED`.

* **Method**: `POST`
* **URL**: `/api/v1/experiments/:id/publish`
* **Request Headers**:
  * `Authorization: Bearer <token>`
* **Success Response**: `200 OK`
```json
{
  "experimentId": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "version": 1,
  "publicSlug": "visual-rt-baseline",
  "publishedAt": "2026-09-26T10:15:00.000Z",
  "status": "PUBLISHED",
  "participantUrl": "https://manovalabs.com/study/visual-rt-baseline"
}
```
* **Error Responses**:
  * `422 Unprocessable Entity`: `{ "error": { "code": "VALIDATION_ERROR", "message": "Cannot publish: Trial 'trial_4a5b' references non-existent nextTrialId 'trial_missing'." } }`
  * `404 Not Found`: `{ "error": { "code": "EXPERIMENT_NOT_FOUND", "message": "Experiment not found." } }`

---

## 5. Participant API

**Base Path**: `/api/v1/participant`  
**Authentication Assumption**: Strictly Anonymous. No authentication tokens or researcher credentials required. Authorized via `sessionId`.

---

### 5.1 Initialize Participant Session
Initializes an anonymous session for a published experiment using its public slug or experiment ID. Locks the session to the current immutable published snapshot.

* **Method**: `POST`
* **URL**: `/api/v1/participant/experiments/:publicSlug/sessions`
* **Request Headers**:
  * `Content-Type: application/json`
* **Request Body Example**:
```json
{
  "clientEnvironment": {
    "browser": "Chrome 128",
    "os": "macOS 14.6",
    "screenResolution": "1920x1080",
    "devicePixelRatio": 2
  }
}
```
* **Success Response**: `201 Created`
```json
{
  "sessionId": "sess_7c8d9e0f-1a2b-4c3d-5e6f-7a8b9c0d1e2f",
  "experimentId": "exp_1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  "experimentTitle": "Simple Visual Reaction Time Study",
  "generalInstructions": "In this experiment, you will observe a central fixation cross (+) followed by a stimulus letter. Press the Spacebar as fast as you can once the stimulus appears.",
  "totalTrials": 2,
  "firstTrial": {
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
      "allowedKeys": ["Space"],
      "evaluationMode": "exact_match"
    },
    "nextTrialId": "trial_5b6c7d8e-9f0a-4b2c-3d4e-5f6a7b8c9d0e",
    "branching": null
  }
}
```
> [!NOTE]
> The `correctResponse` field is intentionally stripped from `firstTrial.expectedResponse` in participant responses to prevent participant-side inspection or tampering.

* **Error Responses**:
  * `404 Not Found`: `{ "error": { "code": "EXPERIMENT_NOT_FOUND", "message": "Study 'visual-rt-baseline' does not exist." } }`
  * `409 Conflict`: `{ "error": { "code": "EXPERIMENT_NOT_PUBLISHED", "message": "This study is in draft status and not accepting participants." } }`

---

### 5.2 Submit Trial Response
Submits the behavioral result for the active trial, logs measured timing telemetry, evaluates correctness, and returns the next trial (or signals session completion).

* **Method**: `POST`
* **URL**: `/api/v1/participant/sessions/:sessionId/trials/:trialId/response`
* **Request Headers**:
  * `Content-Type: application/json`
* **Request Body Example**:
```json
{
  "submittedResponse": "Space",
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
  }
}
```
* **Success Response**: `200 OK`
```json
{
  "responseId": "resp_3d4e5f6a-7b8c-4d1e-2f3a-4b5c6d7e8f9a",
  "isCorrect": true,
  "feedback": "Correct!",
  "sessionStatus": "IN_PROGRESS",
  "nextTrial": {
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
      "allowedKeys": ["Space"],
      "evaluationMode": "exact_match"
    },
    "nextTrialId": null,
    "branching": null
  },
  "isCompleted": false
}
```

* **Terminal Trial Completion Response**:
When submitting the response to the final trial (`nextTrialId === null`):
```json
{
  "responseId": "resp_8a7b6c5d-4e3f-2a1b-0e9f-8a7b6c5d4e3f",
  "isCorrect": true,
  "feedback": null,
  "sessionStatus": "COMPLETED",
  "nextTrial": null,
  "isCompleted": true,
  "completionMessage": "Thank you for participating! Your responses have been anonymously recorded."
}
```

* **Error Responses**:
  * `404 Not Found`: `{ "error": { "code": "SESSION_NOT_FOUND", "message": "Session 'sess_...' not found." } }`
  * `400 Bad Request`: `{ "error": { "code": "INVALID_RESPONSE", "message": "Trial response out of sequence. Active trial is 'trial_4a5b'." } }`
  * `409 Conflict`: `{ "error": { "code": "SESSION_ALREADY_COMPLETED", "message": "This session has already ended." } }`

---

### 5.3 Abandon Session Endpoint (Explicit Abort)
* **Design Decision**: Is a dedicated "complete session" endpoint needed?
  * **Answer**: No dedicated *completion* endpoint is needed because completion is a natural, deterministic state transition reached when the final trial's response is submitted. Creating an extra "complete" call would introduce a race condition where a participant could finish trials but drop offline before the completion call, leaving results in limbo.
  * **However**, a dedicated `POST /participant/sessions/:sessionId/abandon` endpoint **is included** to capture explicit participant withdrawals (e.g., participant clicked "Exit Study", revoked consent, or closed the window). This marks `session.status = 'ABANDONED'` without discarding already recorded trials.

* **Method**: `POST`
* **URL**: `/api/v1/participant/sessions/:sessionId/abandon`
* **Request Body**:
```json
{
  "reason": "participant_withdrew_consent"
}
```
* **Success Response**: `200 OK`
```json
{
  "sessionId": "sess_7c8d9e0f-1a2b-4c3d-5e6f-7a8b9c0d1e2f",
  "status": "ABANDONED"
}
```
