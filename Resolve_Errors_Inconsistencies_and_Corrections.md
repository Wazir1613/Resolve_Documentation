# Resolve Project --- Errors, Inconsistencies, Gaps & Corrections

**Review basis:** Resolve documentation repository plus the
Authentication Service, User & Team Service, and Document Service
repositories previously supplied.

**Purpose:** This document is the consolidated correction list. It
separates confirmed implementation/documentation errors from unresolved
contract gaps so that fixes can be applied one-by-one without guessing.

> **Important:** "Confirmed" means the mismatch was directly visible in
> the supplied documentation/source. "Gap" means the project does not
> currently define enough information to implement the behavior
> consistently.

------------------------------------------------------------------------

## 1. JWT Signing Algorithm Mismatch --- CONFIRMED

### Problem

Authentication Service issues access tokens using:

-   `RS256`
-   a `kid`
-   an RSA private key
-   JWKS exposed at `/.well-known/jwks.json`

User & Team Service currently verifies tokens using:

-   `HS256`
-   `JWT_SECRET`

These are incompatible. A real Authentication-issued RS256 token cannot
be verified by the current HS256 verifier.

### Correction

All downstream services must verify Authentication tokens using the
Authentication Service's JWKS/public key.

Canonical flow:

``` text
Authentication Service
       |
       | RS256 + private key
       v
    Access JWT
       |
       v
Other Services
       |
       | JWKS + kid
       | RS256 verification
       v
Authenticated request
```

### Files

**User & Team Service**

-   `src/security/jwt.js`
-   `src/middleware/authenticate.js`
-   `.env.example`

### Required behavior

Use `jose`:

``` text
createRemoteJWKSet(...)
jwtVerify(..., { algorithms: ['RS256'] })
```

Do not use `JWT_SECRET` for access-token verification.

------------------------------------------------------------------------

## 2. JWT Tenant Claim Naming --- CONFIRMED DOCUMENTATION INCONSISTENCY

### Problem

Different documents use different names:

-   Authentication implementation uses `tenantId`
-   Authentication contract uses `tenantId`
-   User & Team implementation reads `tenantId`
-   Kafka envelope uses `tenantId`
-   Some documentation uses `organization_id`
-   `tasks.md` Task 4 uses `tenant_id`

These refer to different concepts and should not be mixed.

### Correction

Use:

``` text
JWT claim: tenantId
Database column: organization_id
Kafka envelope: tenantId
```

Do **not** use `organization_id` as the JWT claim.

Do **not** use `tenant_id` as the JWT claim.

Example:

``` json
{
  "sub": "user-uuid",
  "tenantId": "organization-uuid"
}
```

The database remains:

``` text
users.organization_id
teams.organization_id
documents.organization_id
cases.organization_id
```

------------------------------------------------------------------------

## 3. JWT `kid` / JWKS Contract --- CURRENTLY MOSTLY CORRECT

Authentication already provides:

``` text
GET /.well-known/jwks.json
```

The token header contains:

``` json
{
  "alg": "RS256",
  "kid": "2026-09-key-1"
}
```

The JWKS contains the corresponding public JWK.

### Correction / requirement

Every downstream service must:

1.  Read `kid` from the JWT header.
2.  Obtain the matching public key from JWKS.
3.  Verify the RS256 signature.
4.  Verify `exp`.
5.  Verify `iss`.
6.  Validate required claims.
7.  Check revocation according to the agreed revocation design.

The JWKS endpoint itself does not need to be replaced.

------------------------------------------------------------------------

## 4. JWT Revocation Checking --- CONFIRMED IMPLEMENTATION GAP

### Problem

The Authentication Service creates:

``` text
tokenId
```

and stores access-token revocation in Redis.

The Authentication Service itself checks revocation.

However, User & Team Service currently only verifies the JWT
signature/claims and does not check the revocation state.

The Authentication contract explicitly says downstream services must
reject a valid-but-revoked token.

### Correction

Choose one of these two documented designs and apply it consistently:

### Preferred design

Give downstream services access to the shared Redis revocation keyspace
and check:

``` text
session:revoked:{tokenId}
```

before accepting the request.

### Alternative

Expose a documented internal Authentication endpoint for
revocation-status checks and define its authentication contract.

Do not silently implement a different convention.

------------------------------------------------------------------------

## 5. User & Team Service Has No JWT Configuration Structure --- CONFIRMED

### Problem

The repository's `.env.example` currently only contains database and
port configuration, while the authentication middleware expects
JWT-related configuration.

### Correction

Add the required settings:

``` env
AUTH_SERVICE_URL=http://localhost:4001
JWT_ISSUER=resolve-authentication-service
```

Remove the obsolete:

``` env
JWT_SECRET=...
```

The JWKS URL should resolve to:

``` text
{AUTH_SERVICE_URL}/.well-known/jwks.json
```

------------------------------------------------------------------------

## 6. Internal Authentication → User/Team Endpoints Are Unauthenticated --- CONFIRMED

### Problem

User & Team Service currently exposes:

``` text
GET   /internal/v1/users/lookup
POST  /internal/v1/users/{id}/verify-credentials
PATCH /internal/v1/users/{id}/password-hash
GET   /internal/v1/users/{id}
```

without authentication.

The source explicitly marks this as temporary:

``` text
TEMPORARY: no auth enforced.
```

Authentication Service actually calls these endpoints.

This is therefore a service-to-service security gap.

### Correction

Implement service-to-service authentication.

The project must define one canonical mechanism, for example:

``` text
Authentication Service
        |
        | internal service credential
        v
User & Team Service
```

The exact header/token format must be frozen in the common contract.

Do not protect these endpoints with a normal end-user JWT unless the
contract explicitly requires that.

------------------------------------------------------------------------

## 7. Service-to-Service Authentication Is Undefined Globally --- GAP

### Problem

`tasks.md` says Task 0 must define:

``` text
service-to-service auth
```

but the concrete mechanism is not consistently defined across the
contracts.

### Correction

Add a common contract specifying:

-   authentication header
-   credential/token type
-   issuer
-   validation mechanism
-   secret/key ownership
-   rotation
-   failure response
-   which endpoints are internal
-   whether internal calls may cross tenants
-   development configuration

Then use the same convention in every service.

------------------------------------------------------------------------

## 8. RBAC Contract Is Missing --- CONFIRMED GAP

`Contracts/RBAC_Service.md` is a gap-flag document rather than a
complete API contract.

Undefined items include:

-   exact REST endpoint(s), or embedded-library design
-   request shape
-   response shape
-   custom roles
-   permission caching
-   authorization for role administration
-   organization-admin permissions
-   cache invalidation
-   error contract

### Correction

Task 5 must first freeze the RBAC contract.

At minimum define:

``` text
roles
permissions
user_roles
role_permissions
```

and a permission-check operation.

Example permission names already used elsewhere include:

``` text
CASE_READ
CASE_APPROVE
DOCUMENT_READ
DOCUMENT_UPLOAD
DOCUMENT_MANAGE
```

The final permission catalog must be centralized rather than
independently invented by each service.

------------------------------------------------------------------------

## 9. Document Service RBAC Is Currently a Stub --- CONFIRMED

### Problem

Document Service's permission client currently returns success without
actually consulting RBAC.

Therefore:

``` text
checkPermission(...)
```

does not provide real authorization.

### Correction

Replace the stub with the final RBAC integration after the RBAC contract
is frozen.

Required behavior:

``` text
JWT authentication
        |
        v
tenant/user context
        |
        v
RBAC permission check
        |
   +----+----+
   |         |
 allow      deny
```

Default must be deny.

------------------------------------------------------------------------

## 10. Document Service Case Check Is Currently a Stub --- CONFIRMED

### Problem

Document Service's case client currently returns success without
actually checking Case Management Service.

### Correction

After the Case Management contract is frozen, Document Service must
verify:

-   case exists
-   case belongs to the authenticated tenant
-   caller is permitted to access the case

Do not leave `assertCaseExists()` as an unconditional success in the
integrated system.

------------------------------------------------------------------------

## 11. Document Service Version Download Uses the Wrong Filename --- CONFIRMED CODE BUG

### Problem

The version download path obtains a specific `version`, but the download
URL is built using:

``` text
document.filename
```

instead of the filename belonging to the requested version.

The version record already has a `filename` field.

### Correction

Use:

``` text
version.filename
```

when generating the version download URL.

This matters when different document versions have different filenames.

------------------------------------------------------------------------

## 12. Document Version Storage-Key Documentation Is Inconsistent --- CONFIRMED

### Documentation says

``` text
documents/{tenant_id}/{case_id}/{document_id}/{filename}
```

### Implementation uses versioned keys

``` text
documents/{tenantId}/{caseId}/{documentId}/v{versionNumber}/{filename}
```

Example:

``` text
documents/
  tenant/
    case/
      document/
        v1/
          file.pdf
        v2/
          file-renamed.pdf
```

### Correction

Freeze the versioned convention in the canonical contract.

Recommended:

``` text
documents/{tenantId}/{caseId}/{documentId}/v{versionNumber}/{filename}
```

Use the same convention in:

-   Document Service code
-   schema documentation
-   API contract
-   tests
-   storage documentation

------------------------------------------------------------------------

## 13. `document_versions.filename` Documentation vs Implementation --- NEEDS RECONCILIATION

The original high-level schema did not contain the version filename
field, while the actual implementation/migration includes it.

The current implementation has:

``` text
document_versions.filename
```

and the API response exposes the filename.

### Correction

Make the high-level schema explicitly include:

``` text
filename
```

in `document_versions`.

The schema and migration must describe the same structure.

------------------------------------------------------------------------

## 14. Document Service Task Dependency Is Incorrect/Incomplete --- CONFIRMED

`tasks.md` currently states:

``` text
Task 8 depends on Tasks 2–5
```

but Document Service performs case existence/ownership checks.

Case Management is Task 6.

### Correction

The dependency should reflect the actual runtime architecture.

At minimum:

``` text
Task 8 → depends on Tasks 2–6
```

if Document Service directly calls Case Management.

If the architecture is intentionally changed so Case Management is not
called, then the contract must explicitly define the alternative.

Do not leave the dependency inconsistent with the implementation.

------------------------------------------------------------------------

## 15. Task 4 Uses `tenant_id` Instead of `tenantId` --- CONFIRMED

Current task text says:

``` text
tenant_id claim embedded and validated
```

### Correction

Change it to:

``` text
tenantId claim embedded and validated
```

Keep:

``` text
organization_id
```

for relational database columns.

------------------------------------------------------------------------

## 16. User & Team Task Ownership Wording Is Inconsistent --- CONFIRMED

Task 3 says the User & Team Service owns the `users` table, but also
describes `password_hash` as being managed by Authentication.

Authentication contract makes the stronger and cleaner decision:

``` text
User & Team owns the entire users table.
Authentication has no direct database access.
Authentication uses internal User & Team endpoints.
```

### Correction

Freeze one rule:

> User & Team Service owns the entire `users` table, including
> `password_hash`. Authentication never directly accesses PostgreSQL.

Authentication may request credential verification and password-hash
updates through authenticated internal endpoints.

------------------------------------------------------------------------

## 17. Authentication Contract's Password-Reset Rate Limiting Is Not Implemented --- CONFIRMED

The schema/contract requires rate limiting for:

``` text
POST /auth/login
POST /auth/password-reset/request
```

The built Authentication Service currently implements login rate
limiting but not equivalent password-reset request rate limiting.

### Correction

Implement Redis-backed password-reset request rate limiting.

The exact Redis key convention must be added to the contract.

Do not downgrade this requirement to "optional" because the schema says
it is mandatory.

------------------------------------------------------------------------

## 18. Password Reset Session Invalidation Is Missing --- CONFIRMED GAP

The authentication schema requires successful password reset to
invalidate existing sessions.

The current implementation updates the password but does not fully
implement the required session invalidation behavior.

### Correction

After a successful password reset:

``` text
password updated
      |
      v
invalidate active sessions
      |
      v
consume reset token
```

The exact Redis session model should be frozen before implementation.

------------------------------------------------------------------------

## 19. Password Reset Email Delivery Is Undefined --- CONFIRMED GAP

Authentication can create/store a reset token, but there is no finalized
synchronous notification contract for delivering the reset link.

Notification Service is described primarily as a Kafka consumer.

### Correction

Define one of:

1.  a synchronous notification/email API,
2.  a dedicated password-reset event and consumer,
3.  another explicitly approved delivery mechanism.

Do not invent an undocumented endpoint.

------------------------------------------------------------------------

## 20. MFA Login Flow Is Contractually Defined but Implementation Is Not --- CONFIRMED GAP

The Authentication contract describes an MFA challenge response, but the
actual cross-service source of the `mfaEnabled` state is not defined.

Possible designs are mentioned, but none is frozen.

### Correction

Before implementing MFA login:

-   decide who owns MFA enrollment state
-   define its storage
-   define the API used during login
-   define challenge-token format
-   define expiry
-   define single-use semantics
-   define rate limiting

Until then, MFA should remain clearly marked as Phase 4/unimplemented.

------------------------------------------------------------------------

## 21. Error Response Formats Are Not Consistent Across Services --- CONFIRMED

The Authentication contract specifies an envelope similar to:

``` json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": {},
    "requestId": "...",
    "traceId": "..."
  }
}
```

User & Team's error middleware currently returns:

``` json
{
  "timestamp": "...",
  "status": 401,
  "code": "...",
  "message": "...",
  "path": "...",
  "requestId": "...",
  "traceId": "..."
}
```

These are different API contracts.

### Correction

Task 0 must freeze one common error format and every service must use
it.

Do not allow each service to invent a different top-level envelope.

------------------------------------------------------------------------

## 22. Internal/Public Authentication Error Codes Need Separation --- GAP

Internal service failures and end-user authentication failures should
not expose implementation details.

### Correction

Define separate conventions for:

``` text
public API errors
internal service-to-service errors
```

and ensure internal dependency failures are mapped safely at public API
boundaries.

------------------------------------------------------------------------

## 23. Authentication JWT `type` Claim and Refresh-Token Design Need Clarification --- DOCUMENTATION ISSUE

The access token contains:

``` text
type = access
```

The documented refresh token is actually an opaque Redis-backed
identifier rather than a JWT.

Yet the JWT contract describes `type` as:

``` text
access | refresh
```

### Correction

If refresh tokens remain opaque:

``` text
JWT type: access only
Refresh token: opaque Redis-backed value, not JWT
```

The contract should state this explicitly rather than implying that
refresh JWTs are currently issued.

------------------------------------------------------------------------

## 24. Authentication Key Storage Is Development-Only --- CONFIRMED ARCHITECTURAL GAP

Authentication's key manager currently supports local PEM-file storage
for development and explicitly warns that production needs a real
secrets backend.

### Correction

Before production:

-   use a real secrets/key-management backend
-   protect the private key
-   define key rotation
-   retain old public keys in JWKS while old tokens remain valid
-   coordinate `kid` rotation

Do not commit private signing keys to Git.

------------------------------------------------------------------------

## 25. Key Rotation Contract Needs Operational Detail --- GAP

`kid` exists, which is good, but the project should define:

``` text
new key generated
    ↓
new kid published in JWKS
    ↓
new tokens use new kid
    ↓
old kid remains published
    ↓
old tokens expire
    ↓
old key removed
```

This should be documented as the standard rotation procedure.

------------------------------------------------------------------------

## 26. Authentication's Internal Organization Call Requires Consistent Service Authentication --- GAP

Authentication calls:

``` text
GET /internal/v1/organizations/by-slug/{slug}
```

using an internal service token.

This is a good direction, but the internal authentication convention
must be made consistent with User & Team and every other internal API.

### Correction

Use one common service-to-service authentication mechanism.

------------------------------------------------------------------------

## 27. Organization Service Repository Could Not Be Reliably Verified --- SOURCE LIMITATION

The supplied Organization Service repository URL was not available
through the repository connector.

Therefore:

-   do not claim its implementation is correct
-   do not invent corrections to its source
-   only correct Organization-related documentation inconsistencies that
    are independently visible

A fresh accessible repository source is required for code-level
Organization Service corrections.

------------------------------------------------------------------------

## 28. RBAC Service Repository Was Not Supplied --- SOURCE LIMITATION

No verified RBAC implementation repository was supplied.

Therefore RBAC code-level correctness cannot currently be certified.

The documentation itself identifies the RBAC contract as incomplete.

### Correction

Freeze the RBAC contract first, then review the implementation against
it.

------------------------------------------------------------------------

## 29. Case Management Service Repository Was Not Supplied --- SOURCE LIMITATION

No verified Case Management implementation repository was supplied.

Therefore the Document → Case integration can be identified as a
contract/implementation dependency, but Case code cannot be audited yet.

------------------------------------------------------------------------

## 30. Kafka Topic List in `tasks.md` Is Stale --- CONFIRMED

Task 1 contains a shorter topic list but explicitly says the
authoritative `Contracts/kafka.md` contains additional topics and
consumers.

### Correction

Use `Contracts/kafka.md` as the authoritative topic/consumer map, or
update Task 1 so it contains exactly the same canonical list.

There should be one source of truth.

------------------------------------------------------------------------

## 31. Kafka Envelope Naming Must Stay Consistent --- VERIFIED CONVENTION

The common event envelope uses:

``` text
eventId
eventType
eventVersion
tenantId
actorId
resourceType
resourceId
timestamp
metadata
```

Do not replace `tenantId` with `organization_id` in event envelopes.

The database naming convention and event naming convention are
intentionally different.

------------------------------------------------------------------------

## 32. One Table / One Owning Service Must Be Enforced --- ARCHITECTURAL CORRECTION

The project has previously described `users.password_hash` in a way that
can imply two services own the same table.

### Correct ownership

``` text
User & Team Service
        |
        └── owns users table
              └── password_hash

Authentication Service
        |
        └── calls internal User & Team APIs
```

This preserves the database-per-service/ownership boundary.

------------------------------------------------------------------------

## 33. Authentication Must Not Directly Connect to User/Team PostgreSQL --- REQUIRED

The current architecture explicitly says Authentication has no direct
PostgreSQL ownership.

### Correction

Authentication should only use:

``` text
User lookup API
Credential verification API
Password-hash update API
```

It must not add a direct database connection to the User & Team
database.

------------------------------------------------------------------------

## 34. Tenant Isolation Must Be Derived From JWT --- REQUIRED

For authenticated public endpoints:

``` text
JWT tenantId
      ↓
request organization context
      ↓
database organization_id filter
```

Do not trust a caller-provided tenant identifier for authorization.

Query/body `organizationId` may exist for documented provisioning/use
cases, but authorization must come from authenticated context.

------------------------------------------------------------------------

## 35. Cross-Tenant Access Behavior Must Be Consistent --- CONTRACT REQUIREMENT

User & Team documentation states that cross-tenant access should return:

``` text
404
```

rather than:

``` text
403
```

when resource existence would otherwise be leaked.

This behavior should be checked consistently across Document, Case,
User, Team, and future services.

------------------------------------------------------------------------

## 36. Idempotency Storage Is Currently In-Memory in User & Team --- CONFIRMED GAP

User & Team's idempotency middleware uses an in-memory map.

That fails across:

-   multiple service instances
-   restarts
-   distributed deployments

### Correction

Use the project's shared Redis idempotency design for production.

The exact Redis key/value/TTL contract should be common across services.

------------------------------------------------------------------------

## 37. Idempotency Requirements Need One Common Contract --- GAP

Task 0 says state-changing operations should use `Idempotency-Key`, but
the exact behavior needs to be standardized.

Define:

-   required endpoints
-   key scope
-   request fingerprint
-   TTL
-   stored response
-   behavior for same key/different body
-   behavior during concurrent requests
-   Redis key naming
-   failure handling

------------------------------------------------------------------------

## 38. Document Upload Idempotency Must Be Distributed --- REQUIRED

Document upload is a state-changing operation and uses an outbox.

Idempotency must prevent:

``` text
same request
    ↓
two DB documents
two S3 objects
two outbox events
```

The final implementation should use durable/distributed idempotency.

------------------------------------------------------------------------

## 39. Outbox and Kafka Must Remain Transactionally Aligned --- REQUIRED

For event-producing services:

``` text
DB transaction
   ├── business data
   └── outbox event
          ↓
      relay
          ↓
        Kafka
```

Do not publish Kafka first and then write business data separately.

Document Service's existing outbox design should remain the model for
other producers.

------------------------------------------------------------------------

## 40. Document Service Versioning Needs Contract-Level Tests --- REQUIRED

Because versions affect both database rows and S3 keys, tests should
verify:

``` text
v1 → correct key
v2 → correct key
v2 download → v2 filename
v1 download → v1 filename
```

and that two versions never overwrite each other's objects.

------------------------------------------------------------------------

# Canonical Naming Rules

These should become the project-wide naming rules:

  Context                   Canonical name
  ------------------------- ----------------------------------
  JWT tenant claim          `tenantId`
  DB tenant column          `organization_id`
  Kafka tenant field        `tenantId`
  User ID JWT claim         `sub`
  JWT key identifier        `kid`
  JWT algorithm             `RS256`
  JWT issuer                `resolve-authentication-service`
  Access-token identifier   `tokenId`
  Access JWT type           `access`
  Document S3 version       `v{versionNumber}`

------------------------------------------------------------------------

# Recommended Correction Order

Do not fix everything simultaneously. Use this order.

## Phase 1 --- Authentication foundation

1.  Fix User & Team HS256 → RS256/JWKS.
2.  Remove `JWT_SECRET`.
3.  Add Authentication Service JWKS configuration.
4.  Standardize `tenantId`.
5.  Implement downstream revocation checking.

## Phase 2 --- Internal security

6.  Secure Authentication → User/Team internal endpoints.
7.  Standardize service-to-service authentication.
8.  Secure Authentication → Organization internal endpoint.
9.  Apply the same internal-auth pattern everywhere.

## Phase 3 --- Authorization

10. Freeze RBAC contract.
11. Replace Document permission stub.
12. Integrate Case permission checks.
13. Standardize deny-by-default behavior.

## Phase 4 --- Document correctness

14. Fix version download filename.
15. Freeze versioned S3 key format.
16. Update high-level schema for `document_versions.filename`.
17. Correct Task 8 dependency on Case Management.
18. Add versioning/idempotency integration tests.

## Phase 5 --- Shared infrastructure

19. Replace in-memory idempotency with Redis.
20. Freeze common error response.
21. Freeze common service-to-service auth.
22. Align Kafka topic documentation.
23. Verify outbox/relay behavior.

## Phase 6 --- Authentication feature gaps

24. Password-reset rate limiting.
25. Password-reset session invalidation.
26. Password-reset email delivery contract.
27. MFA state/flow contract.
28. Production key-management and key rotation.

## Phase 7 --- Final cross-service review

29. Review Organization Service once its repository is accessible.
30. Review RBAC implementation once supplied.
31. Review Case Management implementation once supplied.
32. Run end-to-end authentication → User/Team → RBAC → Case → Document
    tests.
33. Verify documentation and implementation against the final contracts.

------------------------------------------------------------------------

# Final Target Architecture

``` text
                         ┌─────────────────────────┐
                         │ Authentication Service  │
                         │                         │
                         │ RS256 Private Key       │
                         │ JWT Issuer              │
                         │ Redis Sessions          │
                         │ JWKS Endpoint           │
                         └────────────┬────────────┘
                                      │
                              RS256 Access JWT
                              tenantId + sub
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
    User & Team Service       RBAC Service            Case Service
             │                        │                        │
             │                        │                        │
             └──────────────┬─────────┴──────────────┬─────────┘
                            │                        │
                            ▼                        ▼
                     Document Service        Workflow Service
                            │
                            ▼
                       PostgreSQL
                            +
                       S3 Storage
                            +
                       Outbox/Kafka
```

## Non-negotiable security rules

``` text
1. Authentication signs JWTs with RS256.
2. Downstream services verify with JWKS/public keys.
3. JWT tenant claim is tenantId.
4. Database tenant column is organization_id.
5. Private signing keys never leave Authentication.
6. Roles/permissions are not embedded in JWTs.
7. Authorization is deny-by-default.
8. Internal service endpoints require service authentication.
9. Tenant isolation is enforced server-side.
10. Revoked access tokens must be rejected.
11. Database ownership remains one service per table.
12. Kafka events use the common envelope.
```

------------------------------------------------------------------------

# Status Legend

  -----------------------------------------------------------------------
  Status                              Meaning
  ----------------------------------- -----------------------------------
  **CONFIRMED**                       Directly verified in supplied
                                      source code/documentation

  **GAP**                             Requirement exists but
                                      implementation/contract is
                                      incomplete

  **INCONSISTENCY**                   Two project sources disagree

  **SOURCE LIMITATION**               Repository/source was not
                                      available, so code-level
                                      verification is not possible

  **REQUIRED**                        Architectural rule that must be
                                      enforced for the final integrated
                                      system
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Important scope note

This is the **consolidated issue register from the sources currently
accessible**, not a claim that every line of every service has been
audited. The Organization, RBAC, and Case repositories were not all
available for equivalent source-level inspection. Those services should
be added to the register after their actual source is accessible.

The next implementation pass should use this file as the checklist and
resolve the items **one by one**, starting with JWT RS256/JWKS.
