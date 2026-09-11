const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../migrations/runner');

describe('Users API Integration Tests (/api/v1/users)', () => {
  // Use dedicated test organization IDs so automated tests never wipe manual/Postman data
  const orgId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orgId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeAll(async () => {
    await runMigrations(pool);
    // Clean up test data for these test orgs
    await pool.query('DELETE FROM users WHERE organization_id IN ($1, $2)', [orgId1, orgId2]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE organization_id IN ($1, $2)', [orgId1, orgId2]);
    await pool.end();
  });

  describe('POST /api/v1/users', () => {
    it('should create a user successfully (201)', async () => {
      const payload = {
        email: 'alice@example.com',
        username: 'alice',
        fullName: 'Alice Walker',
        status: 'ACTIVE'
      };

      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-user-create-1')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.organizationId).toBe(orgId1);
      expect(res.body.email).toBe(payload.email);
      expect(res.body.username).toBe(payload.username);
      expect(res.body.fullName).toBe(payload.fullName);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('should return 400 IDEMPOTENCY_KEY_REQUIRED if header is missing', async () => {
      const payload = {
        email: 'no-key@example.com',
        username: 'nokey',
        fullName: 'No Key'
      };

      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.path).toBe('/api/v1/users');
    });

    it('should replay the original response if Idempotency-Key is reused with same body', async () => {
      const payload = {
        email: 'bob@example.com',
        username: 'bob',
        fullName: 'Bob Smith'
      };

      const res1 = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-user-replay-1')
        .send(payload);

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-user-replay-1')
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(res1.body.id);
    });

    it('should return 409 IDEMPOTENCY_KEY_REUSED if Idempotency-Key is reused with different body', async () => {
      const key = 'key-user-conflict-1';

      await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', key)
        .send({
          email: 'charlie1@example.com',
          username: 'charlie1',
          fullName: 'Charlie One'
        });

      const res2 = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', key)
        .send({
          email: 'charlie2@example.com',
          username: 'charlie2',
          fullName: 'Charlie Two'
        });

      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
      expect(res2.body.message).toBe('Idempotency-Key was already used with a different request body');
    });

    it('should return 400 USER_VALIDATION_ERROR on invalid or missing fields', async () => {
      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-invalid-1')
        .send({
          email: 'not-an-email',
          fullName: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('USER_VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'username')).toBe(true);
    });

    it('should return 409 USER_EMAIL_TAKEN on duplicate email in the same organization', async () => {
      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-dup-email')
        .send({
          email: 'alice@example.com', // already created
          username: 'different_user',
          fullName: 'Duplicate Email User'
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('USER_EMAIL_TAKEN');
    });

    it('should allow the same email in a different organization', async () => {
      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId2}`)
        .set('Idempotency-Key', 'key-same-email-diff-org')
        .send({
          email: 'alice@example.com',
          username: 'alice_org2',
          fullName: 'Alice in Org 2'
        });

      expect(res.status).toBe(201);
      expect(res.body.organizationId).toBe(orgId2);
      expect(res.body.email).toBe('alice@example.com');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should list users with pagination shape', async () => {
      const res = await request(app)
        .get(`/api/v1/users?organizationId=${orgId1}&page=0&size=10`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('content');
      expect(Array.isArray(res.body.content)).toBe(true);
      expect(res.body).toHaveProperty('page', 0);
      expect(res.body).toHaveProperty('size', 10);
      expect(res.body).toHaveProperty('totalElements');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body.totalElements).toBeGreaterThanOrEqual(1);
    });

    it('should filter users by email', async () => {
      const res = await request(app)
        .get(`/api/v1/users?organizationId=${orgId1}&email=alice@example.com`);

      expect(res.status).toBe(200);
      expect(res.body.content.length).toBe(1);
      expect(res.body.content[0].email).toBe('alice@example.com');
    });

    it('should return 400 USER_VALIDATION_ERROR if organizationId is missing', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('USER_VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    let createdUserId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-get-by-id-setup')
        .send({
          email: 'david@example.com',
          username: 'david',
          fullName: 'David Bowie'
        });
      createdUserId = res.body.id;
    });

    it('should return user by id (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${createdUserId}?organizationId=${orgId1}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdUserId);
      expect(res.body.email).toBe('david@example.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 USER_NOT_FOUND for non-existent id', async () => {
      const res = await request(app)
        .get(`/api/v1/users/00000000-0000-0000-0000-000000000000?organizationId=${orgId1}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 USER_NOT_FOUND if user belongs to a different organization', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${createdUserId}?organizationId=${orgId2}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    let targetUserId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/users?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-patch-setup')
        .send({
          email: 'eva@example.com',
          username: 'eva',
          fullName: 'Eva Green',
          status: 'ACTIVE'
        });
      targetUserId = res.body.id;
    });

    it('should partially update user (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${targetUserId}?organizationId=${orgId1}`)
        .send({
          fullName: 'Eva Updated',
          status: 'INACTIVE'
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetUserId);
      expect(res.body.fullName).toBe('Eva Updated');
      expect(res.body.status).toBe('INACTIVE');
    });

    it('should return 400 USER_INVALID_STATUS if status is not ACTIVE/INACTIVE/SUSPENDED', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${targetUserId}?organizationId=${orgId1}`)
        .send({
          status: 'DELETED'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('USER_INVALID_STATUS');
    });

    it('should return 409 USER_EMAIL_TAKEN if updated email collides with another user in org', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${targetUserId}?organizationId=${orgId1}`)
        .send({
          email: 'alice@example.com' // already used in org1
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('USER_EMAIL_TAKEN');
    });

    it('should return 404 USER_NOT_FOUND for unknown user id', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/00000000-0000-0000-0000-000000000000?organizationId=${orgId1}`)
        .send({ fullName: 'Nobody' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });
});
