// src/scripts/seedDemoUsers.js
const { createUser } = require('../users/users.repository');
const { pool } = require('../db/pool');

// Organization IDs used in the test suite – keep them in sync with your Postman variables
const orgId1 = '11111111-1111-1111-1111-111111111111'; // primary tenant
const orgId2 = '22222222-2222-2222-2222-222222222222'; // secondary tenant

async function seed() {
  try {
    // 1. Alice (org1) – the first successful user creation in the test suite
    const alice = await createUser({
      organizationId: orgId1,
      email: 'alice@example.com',
      username: 'alice',
      fullName: 'Alice Walker',
      status: 'ACTIVE',
    });
    console.log('✅ Created user Alice (org1):', alice.id);

    // 2. Bob (org1) – created during the idempotency‑replay test
    const bob = await createUser({
      organizationId: orgId1,
      email: 'bob@example.com',
      username: 'bob',
      fullName: 'Bob Smith',
      status: 'ACTIVE',
    });
    console.log('✅ Created user Bob (org1):', bob.id);

    // 3. Alice in a different org (org2) – created to verify duplicate‑email handling across tenants
    const aliceOrg2 = await createUser({
      organizationId: orgId2,
      email: 'alice@example.com',
      username: 'alice_org2',
      fullName: 'Alice in Org 2',
      status: 'ACTIVE',
    });
    console.log('✅ Created user Alice (org2):', aliceOrg2.id);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
