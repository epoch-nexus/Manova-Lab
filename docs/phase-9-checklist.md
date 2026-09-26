# Manova Labs — Phase 9 Implementation Checklist

This document tracks all deliverables, architectural decisions, security boundaries, and verification steps for Phase 9 (Integration Hardening & Security Controls).

---

### 1. Phase 9 Technical Decisions & Controls

1. **Rate Limiting (`express-rate-limit`)**:
   * **Scope**: Applied to authentication endpoints (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`).
   * **Configuration**:
     * Window: Configurable via `AUTH_RATE_LIMIT_WINDOW_MS` (default 15 minutes = 900,000 ms).
     * Max requests: Configurable via `AUTH_RATE_LIMIT_MAX` (default 20 requests per window).
   * **Error Response**:
     ```json
     {
       "error": {
         "code": "RATE_LIMIT_EXCEEDED",
         "message": "Too many requests, please try again later."
       }
     }
     ```
     Returns HTTP `429 Too Many Requests`.
   * **Participant Protection**: Legitimate anonymous participant experiment sessions and trial responses are never throttled by the auth rate limiter.
   * **Limitation Note**: In-memory rate limiting is node-local; it mitigates basic automated credential stuffing and brute-force attempts on a single instance, but is not a distributed DDoS mitigation system.

2. **Security Headers (`helmet`)**:
   * Standard HTTP headers enabled across all endpoints:
     * `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing).
     * `X-Frame-Options: SAMEORIGIN` (prevents clickjacking attacks).
     * `Referrer-Policy: no-referrer` (prevents leaking referrers in cross-origin requests).
     * `Content-Security-Policy`: Default `'self'` baseline with support for inline scripts/styles needed by cognitive test canvases/timing tests and HTTPS image assets.
     * `X-DNS-Prefetch-Control: off`.
     * `Strict-Transport-Security` (HSTS) when operating under TLS.
   * Compatible with participant JSON API and media delivery for stimuli.

3. **CORS Configuration**:
   * **Production Behavior (`NODE_ENV === 'production'`)**:
     * Strict whitelist enforced via `CORS_ORIGIN` environment variable (supports single origin or comma-separated list).
     * Requests from unlisted origins are blocked with HTTP `403 FORBIDDEN` (`code: "FORBIDDEN"`).
     * Wildcards with credentials are strictly rejected.
   * **Development Behavior (`NODE_ENV !== 'production'`)**:
     * Permissive origin policy allowing local development and testing across various frontend ports.
   * **Credentials Setting**: Set to `false` (the platform uses `Authorization: Bearer <token>`, not cookie credentials).

4. **CSRF Decision & Rationale**:
   * **Decision**: Cookie-based CSRF protection (e.g. `csurf`) is **NOT applicable** and was intentionally not added.
   * **Rationale**:
     * The Manova Labs API is completely stateless and uses JWTs passed via the HTTP header `Authorization: Bearer <token>`.
     * The backend does not issue session cookies or accept ambient browser credentials (`cookie`, `Set-Cookie`).
     * Web browsers do not automatically attach custom `Authorization` headers to cross-site requests. Therefore, standard Cross-Site Request Forgery (CSRF) is inherently prevented by the Bearer token design.
     * Introducing cookie CSRF tokens would create unnecessary complexity and break headless programmatic API consumers.

5. **Audit Logging Service**:
   * Stored in PostgreSQL via Prisma model `AuditLog`:
     * `id`: UUID (v4).
     * `researcherId`: Optional UUID of the researcher performing the action.
     * `eventType`: Categorical string identifier.
     * `resourceId`: Optional UUID of the affected entity (e.g., experiment ID).
     * `metadata`: JSON object containing safe contextual data.
     * `createdAt`: Timestamp.
   * **Logged Events**:
     * `RESEARCHER_REGISTERED`: New researcher account created.
     * `LOGIN_SUCCESS`: Successful researcher authentication.
     * `LOGIN_FAILED`: Failed login attempt (records attempted email; never records password).
     * `EXPERIMENT_CREATED`: Study definition drafted.
     * `EXPERIMENT_UPDATED`: Study definition updated.
     * `EXPERIMENT_PUBLISHED`: Study snapshot published.
     * `EXPERIMENT_DELETED`: Study removed.
   * **Zero Sensitive Data Ingestion**:
     * Passwords, salted password hashes, JWT tokens, and participant responses are explicitly sanitized and prohibited from audit logs.
   * Non-blocking: Failures in audit logging do not crash or block primary business operations.

6. **Environment & Configuration Validation**:
   * Validated on startup via Zod schema (`src/config/env.ts`):
     * `NODE_ENV`: `'development' | 'production' | 'test'`.
     * `DATABASE_URL`: Validated connection string.
     * `JWT_SECRET`: In production, must be at least 32 characters and cannot equal the default dev secret.
     * `JWT_EXPIRES_IN`: Expiration duration string (e.g. `'24h'`).
     * `CORS_ORIGIN`: Allowed origins.
     * `AUTH_RATE_LIMIT_WINDOW_MS` & `AUTH_RATE_LIMIT_MAX`.
   * **Fail-Fast Security**: If production is detected with an insecure or missing secret, the application fails to start immediately with an explicit descriptive error.

7. **Error Handling & Information Disclosure**:
   * Global centralized error handling:
     * Maintains uniform format: `{ error: { code, message, details } }`.
     * In production (`NODE_ENV === 'production'`), generic messages are used for unhandled 500 errors to prevent leaking internal database schemas, paths, or connection credentials.
     * Stack traces are never exposed in JSON responses.
     * 401, 403, 400, 404, 409, 422, and 429 status codes and error structures are preserved.

---

### 2. Environment Variables Summary

| Variable | Required in Prod? | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Recommended | `'development'` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | **Yes** | Local PostgreSQL URI | PostgreSQL connection string |
| `JWT_SECRET` | **Yes (min 32 chars)** | Dev fallback key | Secret key for signing and verifying JWTs |
| `JWT_EXPIRES_IN` | No | `'24h'` | Token validity lifetime string |
| `CORS_ORIGIN` | **Yes in Prod** | `'*'` | Comma-separated allowed origins for CORS in production |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` (15m) | Rate limiting sliding window in ms |
| `AUTH_RATE_LIMIT_MAX` | No | `20` | Max auth attempts per sliding window |

---

### 3. Verification Matrix & Test Status

* **Unit & Integration Tests**: 9 suites, **129 passing tests** (100% pass rate).
  * `tests/security.test.ts`: **14 tests** (security headers, rate limiting 429, CORS prod allowed/rejected, config validation fail-fast, audit logging, no sensitive leak in logs, stack trace hiding, 401/403 regression, participant anonymity).
  * `tests/auth.test.ts`: 35 tests.
  * `tests/experiments.test.ts`: 15 tests.
  * `tests/results.test.ts`: 9 tests.
  * `tests/participant-execution.test.ts`: 10 tests.
  * `tests/randomization.test.ts`: 15 tests.
  * `tests/branching.test.ts`: 14 tests.
  * `tests/timing-engine.test.ts`: 11 tests.
  * `tests/execution-engine.test.ts`: 23 tests.
* **Live Smoke Test**: `scripts/smoke-test.ts` (21 live steps verifying all 9 phases end-to-end, including security headers and audit trail).
* **Prisma Migrations**: 6 migrations applied, schema up to date.
* **TypeScript & Build**: `npm run typecheck` and `npm run build` both clean (0 errors).

---

### 4. Known Limitations & Out-of-Scope Items

* **Distributed Rate Limiting**: The current rate limiter uses an in-memory store. For multi-instance clustered deployments, a Redis-backed store (e.g. `rate-limit-redis`) would be appropriate.
* **WAF & DDoS**: Application-level rate limiting does not replace network-level DDoS mitigation (e.g., Cloudflare, AWS Shield).
* **Audit Log Export / Retention**: Audit records are persisted immutably in PostgreSQL without automated archival or researcher-facing audit query APIs.
* **Intentionally NOT Implemented**:
  * No OAuth, Google/GitHub login, MFA, or password reset emails.
  * No refresh-token rotation or server-side token revocation lists.
  * No enterprise SSO or organization-level RBAC.
  * No frontend authentication or admin UI.
  * No Phase 10 demo preparation.
