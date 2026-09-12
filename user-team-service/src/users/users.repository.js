const { pool } = require('../db/pool');

const PUBLIC_COLUMNS = `
  id,
  organization_id,
  email,
  username,
  full_name,
  status,
  created_at,
  updated_at
`;

function toPublicUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(err) {
  return err && err.code === '23505';
}

async function insertUser({ organizationId, email, username, fullName, status }) {
  const result = await pool.query(
    `INSERT INTO users (organization_id, email, username, full_name, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [organizationId, email, username, fullName, status]
  );
  return toPublicUser(result.rows[0]);
}

async function findByIdInOrg(id, organizationId) {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM users
     WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return toPublicUser(result.rows[0]);
}

async function listUsers({ organizationId, email, username, status, limit, offset, sortColumn, sortDirection }) {
  const conditions = ['organization_id = $1'];
  const params = [organizationId];

  if (email) {
    params.push(email);
    conditions.push(`email = $${params.length}`);
  }
  if (username) {
    params.push(username);
    conditions.push(`username = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users WHERE ${where}`,
    params
  );

  params.push(limit, offset);
  const listResult = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM users
     WHERE ${where}
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    rows: listResult.rows.map(toPublicUser),
    totalElements: countResult.rows[0].total,
  };
}

async function updateUser(id, organizationId, fields) {
  const sets = [];
  const params = [];

  if (fields.email !== undefined) {
    params.push(fields.email);
    sets.push(`email = $${params.length}`);
  }
  if (fields.username !== undefined) {
    params.push(fields.username);
    sets.push(`username = $${params.length}`);
  }
  if (fields.fullName !== undefined) {
    params.push(fields.fullName);
    sets.push(`full_name = $${params.length}`);
  }
  if (fields.status !== undefined) {
    params.push(fields.status);
    sets.push(`status = $${params.length}`);
  }

  if (sets.length === 0) {
    return findByIdInOrg(id, organizationId);
  }

  sets.push('updated_at = now()');
  params.push(id, organizationId);

  const result = await pool.query(
    `UPDATE users
     SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING ${PUBLIC_COLUMNS}`,
    params
  );
  return toPublicUser(result.rows[0]);
}

module.exports = {
  insertUser,
  findByIdInOrg,
  listUsers,
  updateUser,
  isUniqueViolation,
  toPublicUser,
};
