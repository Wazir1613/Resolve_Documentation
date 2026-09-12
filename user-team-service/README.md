# User & Team Service

Express.js + PostgreSQL service for Resolve users, teams, and team membership.

## How to run

```bash
docker compose up -d
npm install
copy .env.example .env
npm start
```

Migrations run on startup. To run them alone: `npm run migrate`.

Health check: `GET http://localhost:8080/health`

## Phase 2 (current)

Public user endpoints are live. Teams, team members, and `/internal/v1` are not built yet.

Use a UUID for `organizationId` on every public request, for example:

`11111111-1111-1111-1111-111111111111`

### Create user

```bash
curl -X POST "http://localhost:8080/api/v1/users?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: create-jane-1" ^
  -d "{\"email\":\"jane.doe@resolve.com\",\"username\":\"jane.doe\",\"fullName\":\"Jane Doe\",\"status\":\"ACTIVE\"}"
```

### List users

```bash
curl "http://localhost:8080/api/v1/users?organizationId=11111111-1111-1111-1111-111111111111&page=0&size=20&sort=createdAt,desc"
```

### Get one user

```bash
curl "http://localhost:8080/api/v1/users/<user-id>?organizationId=11111111-1111-1111-1111-111111111111"
```

### Patch user

```bash
curl -X PATCH "http://localhost:8080/api/v1/users/<user-id>?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Jane D.\"}"
```

## Remaining phases

- **Phase 3** — public team and member endpoints (`/api/v1/teams`)
- **Phase 4** — internal endpoints (`/internal/v1/...`) and Jest + Supertest coverage

## Endpoints so far

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/api/v1/users` | Create a user (requires `Idempotency-Key`) |
| GET | `/api/v1/users` | List users in an organization |
| GET | `/api/v1/users/:id` | Get one user in an organization |
| PATCH | `/api/v1/users/:id` | Partially update a user |
