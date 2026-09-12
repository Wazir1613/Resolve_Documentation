const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../src/db/migrate');
const { resetIdempotencyStore } = require('../src/middleware/idempotency');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

let keyCounter = 0;
let dbReady = false;

function idempotencyKey(prefix) {
  keyCounter += 1;
  return `${prefix}-${Date.now()}-${keyCounter}`;
}

async function createUser(overrides = {}) {
  const body = {
    email: `user-${Date.now()}-${keyCounter}@resolve.com`,
    username: `user-${Date.now()}-${keyCounter}`,
    fullName: 'Test User',
    status: 'ACTIVE',
    ...overrides,
  };

  const res = await request(app)
    .post(`/api/v1/users?organizationId=${body.organizationId || ORG_A}`)
    .set('Idempotency-Key', idempotencyKey('create-user'))
    .send(body);

  expect(res.status).toBe(201);
  return res.body;
}

async function createTeam(overrides = {}) {
  const orgId = overrides.organizationId || ORG_A;
  const body = {
    name: `Team ${Date.now()} ${keyCounter}`,
    ...overrides,
  };
  delete body.organizationId;

  const res = await request(app)
    .post(`/api/v1/teams?organizationId=${orgId}`)
    .set('Idempotency-Key', idempotencyKey('create-team'))
    .send(body);

  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  try {
    await runMigrations(pool);
    dbReady = true;
  } catch (err) {
    console.error(
      `Integration tests require PostgreSQL at ${process.env.DATABASE_URL}. Start it with docker compose up -d before running npm test.`
    );
    throw err;
  }
});

afterEach(async () => {
  resetIdempotencyStore();
  if (!dbReady) {
    return;
  }
  await pool.query('DELETE FROM team_members');
  await pool.query('DELETE FROM teams');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('health', () => {
  test('returns service health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'user-team-service' });
  });
});

describe('public user endpoints', () => {
  test('creates a user and excludes passwordHash', async () => {
    const res = await request(app)
      .post(`/api/v1/users?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('create-user'))
      .send({
        email: 'jane.doe@resolve.com',
        username: 'jane.doe',
        fullName: 'Jane Doe',
        passwordHash: 'must-not-be-accepted',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      organizationId: ORG_A,
      email: 'jane.doe@resolve.com',
      username: 'jane.doe',
      fullName: 'Jane Doe',
      status: 'ACTIVE',
    });
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('rejects user creation without an Idempotency-Key', async () => {
    const res = await request(app)
      .post(`/api/v1/users?organizationId=${ORG_A}`)
      .send({ email: 'jane.doe@resolve.com', username: 'jane.doe', fullName: 'Jane Doe' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  test('lists users for one organization', async () => {
    await createUser({ email: 'a@resolve.com', username: 'a-user' });
    await createUser({ email: 'b@resolve.com', username: 'b-user', organizationId: ORG_B });

    const res = await request(app).get(`/api/v1/users?organizationId=${ORG_A}&page=0&size=20`);

    expect(res.status).toBe(200);
    expect(res.body.totalElements).toBe(1);
    expect(res.body.content[0].organizationId).toBe(ORG_A);
  });

  test('returns validation error when listing users without organizationId', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('USER_VALIDATION_ERROR');
    expect(res.body.errors[0].field).toBe('organizationId');
  });

  test('gets one user inside its organization', async () => {
    const user = await createUser();

    const res = await request(app).get(`/api/v1/users/${user.id}?organizationId=${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  test('hides a user from another organization', async () => {
    const user = await createUser();

    const res = await request(app).get(`/api/v1/users/${user.id}?organizationId=${ORG_B}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  test('patches a user', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch(`/api/v1/users/${user.id}?organizationId=${ORG_A}`)
      .send({ fullName: 'Updated User' });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Updated User');
  });

  test('rejects an invalid user status', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch(`/api/v1/users/${user.id}?organizationId=${ORG_A}`)
      .send({ status: 'DISABLED' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('USER_INVALID_STATUS');
  });
});

describe('public team endpoints', () => {
  test('creates a team', async () => {
    const res = await request(app)
      .post(`/api/v1/teams?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('create-team'))
      .send({ name: 'Investigations Team' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ organizationId: ORG_A, name: 'Investigations Team' });
  });

  test('rejects team creation without a name', async () => {
    const res = await request(app)
      .post(`/api/v1/teams?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('create-team'))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TEAM_VALIDATION_ERROR');
  });

  test('lists teams for one organization', async () => {
    await createTeam({ name: 'A Team' });
    await createTeam({ name: 'B Team', organizationId: ORG_B });

    const res = await request(app).get(`/api/v1/teams?organizationId=${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.totalElements).toBe(1);
    expect(res.body.content[0].name).toBe('A Team');
  });

  test('rejects team listing without organizationId', async () => {
    const res = await request(app).get('/api/v1/teams');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TEAM_VALIDATION_ERROR');
  });

  test('gets one team', async () => {
    const team = await createTeam();

    const res = await request(app).get(`/api/v1/teams/${team.id}?organizationId=${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(team.id);
  });

  test('returns TEAM_NOT_FOUND for a cross-organization team', async () => {
    const team = await createTeam();

    const res = await request(app).get(`/api/v1/teams/${team.id}?organizationId=${ORG_B}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_NOT_FOUND');
  });

  test('renames a team', async () => {
    const team = await createTeam();

    const res = await request(app)
      .patch(`/api/v1/teams/${team.id}?organizationId=${ORG_A}`)
      .send({ name: 'Escalations Team' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Escalations Team');
  });

  test('returns TEAM_NAME_TAKEN when renaming to an existing team name', async () => {
    const team = await createTeam({ name: 'Original Team' });
    await createTeam({ name: 'Existing Team' });

    const res = await request(app)
      .patch(`/api/v1/teams/${team.id}?organizationId=${ORG_A}`)
      .send({ name: 'Existing Team' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TEAM_NAME_TAKEN');
  });

  test('deletes a team', async () => {
    const team = await createTeam();

    const res = await request(app).delete(`/api/v1/teams/${team.id}?organizationId=${ORG_A}`);

    expect(res.status).toBe(204);
  });

  test('returns TEAM_NOT_FOUND when deleting a missing team', async () => {
    const res = await request(app).delete(`/api/v1/teams/${ORG_A}?organizationId=${ORG_A}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_NOT_FOUND');
  });
});

describe('team member endpoints', () => {
  test('adds a team member', async () => {
    const user = await createUser();
    const team = await createTeam();

    const res = await request(app)
      .post(`/api/v1/teams/${team.id}/members?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('add-member'))
      .send({ userId: user.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ teamId: team.id, userId: user.id });
  });

  test('returns USER_NOT_FOUND when adding a member from another organization', async () => {
    const user = await createUser({ organizationId: ORG_B });
    const team = await createTeam();

    const res = await request(app)
      .post(`/api/v1/teams/${team.id}/members?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('add-member'))
      .send({ userId: user.id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  test('lists team members', async () => {
    const user = await createUser({ email: 'member@resolve.com', fullName: 'Member User' });
    const team = await createTeam();
    await request(app)
      .post(`/api/v1/teams/${team.id}/members?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('add-member'))
      .send({ userId: user.id });

    const res = await request(app).get(`/api/v1/teams/${team.id}/members?organizationId=${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.totalElements).toBe(1);
    expect(res.body.content[0]).toMatchObject({
      userId: user.id,
      fullName: 'Member User',
      email: 'member@resolve.com',
    });
  });

  test('returns TEAM_NOT_FOUND when listing members for a missing team', async () => {
    const res = await request(app).get(`/api/v1/teams/${ORG_A}/members?organizationId=${ORG_A}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_NOT_FOUND');
  });

  test('removes a team member', async () => {
    const user = await createUser();
    const team = await createTeam();
    await request(app)
      .post(`/api/v1/teams/${team.id}/members?organizationId=${ORG_A}`)
      .set('Idempotency-Key', idempotencyKey('add-member'))
      .send({ userId: user.id });

    const res = await request(app).delete(
      `/api/v1/teams/${team.id}/members/${user.id}?organizationId=${ORG_A}`
    );

    expect(res.status).toBe(204);
  });

  test('returns TEAM_MEMBER_NOT_FOUND when removing a missing member', async () => {
    const user = await createUser();
    const team = await createTeam();

    const res = await request(app).delete(
      `/api/v1/teams/${team.id}/members/${user.id}?organizationId=${ORG_A}`
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_MEMBER_NOT_FOUND');
  });
});

describe('internal user endpoints', () => {
  test('sets a password hash', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch(`/internal/v1/users/${user.id}/password-hash`)
      .send({ newPlaintextPassword: '$2b$12$abc' });

    expect(res.status).toBe(204);
  });

  test('rejects password hash update without passwordHash or newPlaintextPassword', async () => {
    const user = await createUser();

    const res = await request(app)
      .patch(`/internal/v1/users/${user.id}/password-hash`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('USER_VALIDATION_ERROR');
  });

  test('looks up a user for Authentication', async () => {
    const user = await createUser({ email: 'lookup@resolve.com' });
    await request(app)
      .patch(`/internal/v1/users/${user.id}/password-hash`)
      .send({ passwordHash: '$2b$12$lookup' });

    const res = await request(app).get(
      `/internal/v1/users/lookup?organizationId=${ORG_A}&email=lookup@resolve.com`
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      userId: user.id,
      status: 'ACTIVE',
    });
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('returns USER_NOT_FOUND for a missing internal lookup', async () => {
    const res = await request(app).get(
      `/internal/v1/users/lookup?organizationSlug=${ORG_A}&email=missing@resolve.com`
    );

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  test('verifies matching credentials by local equality check', async () => {
    const user = await createUser();
    await request(app)
      .patch(`/internal/v1/users/${user.id}/password-hash`)
      .send({ newPlaintextPassword: '$2b$12$verify' });

    const res = await request(app)
      .post(`/internal/v1/users/${user.id}/verify-credentials`)
      .send({ plaintextPassword: '$2b$12$verify' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, status: 'ACTIVE', organizationId: ORG_A });
  });

  test('returns USER_NOT_FOUND when verifying a missing user', async () => {
    const res = await request(app)
      .post(`/internal/v1/users/${ORG_A}/verify-credentials`)
      .send({ passwordHash: '$2b$12$verify' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  test('gets internal user status', async () => {
    const user = await createUser({ fullName: 'Internal User' });

    const res = await request(app).get(`/internal/v1/users/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: user.id,
      organizationId: ORG_A,
      fullName: 'Internal User',
      status: 'ACTIVE',
    });
  });

  test('returns USER_NOT_FOUND for a missing internal user status check', async () => {
    const res = await request(app).get(`/internal/v1/users/${ORG_A}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });
});
