# Manova Labs — Phase 8 Implementation Checklist

This document tracks all deliverables, architectural decisions, security boundaries, and verification steps for Phase 8 (Researcher Authentication & Authorization).

---

### 1. Phase 8 Technical Decisions & Architecture

1. **Researcher Account Model**:
   * Stored in PostgreSQL via Prisma model `Researcher`:
     * `id`: UUID (v4) primary key.
     * `email`: Unique string, validated via Zod (`z.string().email().toLowerCase().trim()`).
     * `passwordHash`: Standard salted bcrypt hash string (never plaintext).
     * `name`: Optional display name string.
     * `createdAt` & `updatedAt`: ISO 8601 timestamps.
   * Direct 1-to-many relationship with `Experiment`:
     * `experiments Experiment[]` on `Researcher`.
     * `researcher Researcher @relation(fields: [ownerResearcherId], references: [id], onDelete: Cascade)` on `Experiment`.
     * Guarantees foreign key integrity; experiment records cannot exist without an authentic researcher owner.

2. **Standard Cryptography & Password Hashing**:
   * Uses `bcryptjs` with standard 10 salt rounds.
   * Passwords must be at least 8 characters long (validated with Zod on registration).
   * **Zero Plaintext Persistence**: Plaintext passwords exist solely in ephemeral memory during registration/login execution and are never persisted or included in logs.
   * **Zero Leakage**: Password hashes are stripped from all API outputs (`auth.service.ts` transforms researcher records to `ResearcherProfile` excluding `passwordHash`).

3. **JWT Authentication Flow**:
   * Issues standard signed JSON Web Tokens via `jsonwebtoken` (`HS256` symmetric algorithm).
   * **Minimal Payload**:
     ```json
     {
       "researcherId": "uuid-v4",
       "email": "user@example.com",
       "iat": 1711438800,
       "exp": 1711525200
     }
     ```
   * **Payload Safety**: Contains zero passwords, zero password hashes, zero experiment data, and zero sensitive keys.
   * **Verification**: Verifies token signature and expiration against `JWT_SECRET`.

4. **Authentication Middleware (`requireAuth`)**:
   * Applied to protected researcher routes.
   * Inspects `Authorization: Bearer <token>` header.
   * Emits standardized 401 `UNAUTHORIZED` if:
     * Header is missing or does not start with `Bearer `.
     * Token is malformed, invalid, or forged.
     * Token has expired.
     * Researcher record was deleted from the database.
   * Attaches authenticated identity `req.researcher = { id, email }` to the Express request context.

5. **Resource Ownership & Authorization (401 vs 403)**:
   * **Authentication Boundary (401 UNAUTHORIZED)**: Any unauthenticated request attempting to access or modify researcher resources is rejected with 401.
   * **Authorization Boundary (403 FORBIDDEN)**: When an authenticated researcher attempts to access, read, update, delete, publish, or view results for an experiment owned by another researcher (`experiment.ownerResearcherId !== researcher.id`), the system strictly returns 403 `FORBIDDEN`.
   * **Scoped Listing**: `GET /api/v1/experiments` queries only experiments owned by the calling researcher (`where: { ownerResearcherId: researcherId }`), preventing cross-researcher enumeration.

6. **Absolute Participant Anonymity & Public Access**:
   * Participant routes remain **100% public and anonymous**:
     * `POST /api/v1/participant/experiments/:publicSlug/sessions`
     * `GET  /api/v1/participant/sessions/:sessionId`
     * `GET  /api/v1/participant/sessions/:sessionId/current-step`
     * `POST /api/v1/participant/sessions/:sessionId/trials/:trialId/response`
     * `POST /api/v1/participant/sessions/:sessionId/abandon`
   * **Zero Auth Required**: No JWT, no cookies, no accounts, and no credentials needed.
   * **Zero Identity Leakage**: Participant session responses never include `ownerResearcherId` or any researcher information.
   * **Session Security**: Session access is protected by unguessable 128-bit UUID identifiers (`sess_<uuid>`). Session endpoints are strictly scoped to the active `sessionId`.

---

### 2. Protected vs. Public API Surface

| Endpoint | Method | Role | Auth Required? | Error Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | Researcher | No (Public) | 400 validation, 409 duplicate email |
| `/api/v1/auth/login` | `POST` | Researcher | No (Public) | 400 validation, 401 bad credentials |
| `/api/v1/auth/me` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized |
| `/api/v1/experiments` | `POST` | Researcher | **Yes (JWT)** | 401 unauthorized |
| `/api/v1/experiments` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized (returns caller's studies only) |
| `/api/v1/experiments/:id` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id` | `PUT` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id` | `DELETE` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id/publish` | `POST` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id/results` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id/results/summary` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id/results/export.json` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/experiments/:id/results/export.csv` | `GET` | Researcher | **Yes (JWT)** | 401 unauthorized, 403 forbidden if not owner |
| `/api/v1/participant/experiments/:slug/sessions` | `POST` | Participant | **No (Anonymous)** | 404/409 if study draft or not found |
| `/api/v1/participant/sessions/:sessionId` | `GET` | Participant | **No (Anonymous)** | 404 session not found |
| `/api/v1/participant/sessions/:sessionId/current-step` | `GET` | Participant | **No (Anonymous)** | 404 session not found |
| `/api/v1/participant/sessions/:sessionId/trials/:id/response` | `POST` | Participant | **No (Anonymous)** | 400/404/409 state or trial mismatch |
| `/api/v1/participant/sessions/:sessionId/abandon` | `POST` | Participant | **No (Anonymous)** | 404 session not found |

---

### 3. Environment Variables & Configuration

The authentication system requires the following environment variables (with development fallbacks for local testing):

| Variable | Description | Default (Dev Only) |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret key used to sign and verify HMAC SHA-256 JWT tokens. | `manova-labs-dev-secret-do-not-use-in-production-32bytes` |
| `JWT_EXPIRES_IN` | Token validity duration string (e.g., `24h`, `7d`). | `24h` |
| `DATABASE_URL` | PostgreSQL connection string. | Standard local connection |

> [!CAUTION]
> In production environments, `JWT_SECRET` must be set to a cryptographically secure random string with at least 256 bits of entropy. Never commit production secrets.

---

### 4. What Is Intentionally NOT Implemented (Scope Guardrails)

To adhere strictly to Phase 8 scope and prevent premature complexity:
1. **No OAuth / Social Logins**: No Google, GitHub, Apple, or SAML authentication.
2. **No Multi-Factor Authentication (MFA)**: No TOTP, SMS, or WebAuthn.
3. **No Password Reset Emails**: No SMTP integrations or magic links.
4. **No Refresh Token Rotation**: Session state is managed via stateless JWT with configured lifetime.
5. **No Enterprise SSO / Complex RBAC**: Researcher role is uniform; permissions are governed purely by resource ownership.
6. **No Phase 9 Production Hardening**:
   * No IP-based rate limiting.
   * No CSRF token architecture (API is stateless Bearer token authenticated, not cookie session based).
   * No compliance audit logging tables.
   * No cloud deployment configurations.

---

### 5. Verification Matrix & Test Status

* **Unit & Integration Tests**: 8 suites, **115 passing tests**
  * `tests/auth.test.ts`: 35 tests (registration, duplicate rejection, password hashing, /me, JWT validation, 401 vs 403, participant anonymity, all test combinations).
  * `tests/experiments.test.ts`: 15 tests (CRUD, publishing, versioning with auth).
  * `tests/results.test.ts`: 9 tests (results queries, summaries, CSV/JSON export with auth).
  * `tests/participant-execution.test.ts`: 10 tests (session progression, anonymity).
  * `tests/randomization.test.ts`: 15 tests (randomized orders, seed independence).
  * `tests/branching.test.ts`: 14 tests (dynamic branching, loop guards).
  * `tests/timing-engine.test.ts`: 11 tests (sub-frame timing, telemetry).
  * `tests/execution-engine.test.ts`: 23 tests (state transitions, timeouts).
* **Live Smoke Test**: `scripts/smoke-test.ts` (20 live end-to-end steps covering all 8 phases).
* **Prisma Migration**: `20260926072139_add_researcher_auth` applied and verified.
* **TypeScript & Build**: `npm run typecheck` and `npm run build` both clean (0 errors).
