const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../migrations/runner');

describe('Teams API Integration Tests (/api/v1/teams)', () => {
  // Use dedicated test organization IDs so automated tests never wipe manual/Postman data
  const orgId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const orgId2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  beforeAll(async () => {
    await runMigrations(pool);
    await pool.query('DELETE FROM teams WHERE organization_id IN ($1, $2)', [orgId1, orgId2]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM teams WHERE organization_id IN ($1, $2)', [orgId1, orgId2]);
    await pool.end();
  });

  describe('POST /api/v1/teams', () => {
    it('should create a team successfully (201)', async () => {
      const payload = { name: 'Investigations Team' };

      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-create-1')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.organizationId).toBe(orgId1);
      expect(res.body.name).toBe('Investigations Team');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should return 400 IDEMPOTENCY_KEY_REQUIRED if header is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .send({ name: 'Security Team' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    });

    it('should replay original response if Idempotency-Key is reused with same body', async () => {
      const payload = { name: 'Operations Team' };

      const res1 = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-replay-1')
        .send(payload);

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-replay-1')
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(res1.body.id);
    });

    it('should return 409 IDEMPOTENCY_KEY_REUSED if Idempotency-Key is reused with different body', async () => {
      const key = 'key-team-conflict-1';

      await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', key)
        .send({ name: 'Alpha Team' });

      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', key)
        .send({ name: 'Beta Team' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });

    it('should return 400 TEAM_VALIDATION_ERROR if name is missing or invalid', async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-val-err')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TEAM_VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should return 409 TEAM_NAME_TAKEN if team name already exists in same org', async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-dup')
        .send({ name: 'Investigations Team' }); // already created above

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('TEAM_NAME_TAKEN');
    });

    it('should allow same team name in a different organization', async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId2}`)
        .set('Idempotency-Key', 'key-team-diff-org')
        .send({ name: 'Investigations Team' });

      expect(res.status).toBe(201);
      expect(res.body.organizationId).toBe(orgId2);
      expect(res.body.name).toBe('Investigations Team');
    });
  });

  describe('GET /api/v1/teams', () => {
    it('should list teams with pagination shape', async () => {
      const res = await request(app)
        .get(`/api/v1/teams?organizationId=${orgId1}&page=0&size=10`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('content');
      expect(Array.isArray(res.body.content)).toBe(true);
      expect(res.body).toHaveProperty('page', 0);
      expect(res.body).toHaveProperty('size', 10);
      expect(res.body).toHaveProperty('totalElements');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body.totalElements).toBeGreaterThanOrEqual(1);
    });

    it('should filter teams by name', async () => {
      const res = await request(app)
        .get(`/api/v1/teams?organizationId=${orgId1}&name=Investigations`);

      expect(res.status).toBe(200);
      expect(res.body.content.length).toBe(1);
      expect(res.body.content[0].name).toBe('Investigations Team');
    });

    it('should return 400 TEAM_VALIDATION_ERROR if organizationId is missing', async () => {
      const res = await request(app).get('/api/v1/teams');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TEAM_VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/teams/:id', () => {
    let createdTeamId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-get-id')
        .send({ name: 'Support Team' });
      createdTeamId = res.body.id;
    });

    it('should return team by id (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/${createdTeamId}?organizationId=${orgId1}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdTeamId);
      expect(res.body.name).toBe('Support Team');
    });

    it('should return 404 TEAM_NOT_FOUND for non-existent team id', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/00000000-0000-0000-0000-000000000000?organizationId=${orgId1}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEAM_NOT_FOUND');
    });

    it('should return 404 TEAM_NOT_FOUND if team belongs to different organization', async () => {
      const res = await request(app)
        .get(`/api/v1/teams/${createdTeamId}?organizationId=${orgId2}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEAM_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/teams/:id', () => {
    let targetTeamId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', 'key-team-patch-id')
        .send({ name: 'Old Team Name' });
      targetTeamId = res.body.id;
    });

    it('should rename a team (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/teams/${targetTeamId}?organizationId=${orgId1}`)
        .send({ name: 'Renamed Team' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetTeamId);
      expect(res.body.name).toBe('Renamed Team');
    });

    it('should return 400 TEAM_VALIDATION_ERROR if name is empty', async () => {
      const res = await request(app)
        .patch(`/api/v1/teams/${targetTeamId}?organizationId=${orgId1}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TEAM_VALIDATION_ERROR');
    });

    it('should return 409 TEAM_NAME_TAKEN if renamed to an existing team in same org', async () => {
      const res = await request(app)
        .patch(`/api/v1/teams/${targetTeamId}?organizationId=${orgId1}`)
        .send({ name: 'Investigations Team' }); // already taken in orgId1

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('TEAM_NAME_TAKEN');
    });

    it('should return 404 TEAM_NOT_FOUND for non-existent team', async () => {
      const res = await request(app)
        .patch(`/api/v1/teams/00000000-0000-0000-0000-000000000000?organizationId=${orgId1}`)
        .send({ name: 'Ghost Team' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEAM_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/teams/:id', () => {
    let deleteTeamId;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/teams?organizationId=${orgId1}`)
        .set('Idempotency-Key', `key-team-del-${Date.now()}`)
        .send({ name: `Disposable Team ${Date.now()}` });
      deleteTeamId = res.body.id;
    });

    it('should delete a team successfully (204)', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/${deleteTeamId}?organizationId=${orgId1}`);

      expect(res.status).toBe(204);

      // Verify team no longer exists
      const checkRes = await request(app)
        .get(`/api/v1/teams/${deleteTeamId}?organizationId=${orgId1}`);
      expect(checkRes.status).toBe(404);
      expect(checkRes.body.code).toBe('TEAM_NOT_FOUND');
    });

    it('should return 404 TEAM_NOT_FOUND for non-existent team', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/00000000-0000-0000-0000-000000000000?organizationId=${orgId1}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEAM_NOT_FOUND');
    });

    it('should return 404 TEAM_NOT_FOUND when trying to delete from a different organization', async () => {
      const res = await request(app)
        .delete(`/api/v1/teams/${deleteTeamId}?organizationId=${orgId2}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEAM_NOT_FOUND');
    });
  });
});
