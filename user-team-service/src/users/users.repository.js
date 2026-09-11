const { query } = require('../db/pool');

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createUser({ organizationId, email, username, fullName, status = 'ACTIVE' }) {
  const sql = `
    INSERT INTO users (organization_id, email, username, full_name, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, organization_id, email, username, full_name, status, created_at, updated_at;
  `;
  const values = [organizationId, email, username, fullName, status];
  const res = await query(sql, values);
  return mapUserRow(res.rows[0]);
}

async function findUserById(id, organizationId) {
  const sql = `
    SELECT id, organization_id, email, username, full_name, status, created_at, updated_at
    FROM users
    WHERE id = $1 AND organization_id = $2;
  `;
  const res = await query(sql, [id, organizationId]);
  return mapUserRow(res.rows[0]);
}

async function findUsers({ organizationId, email, username, status, limit, offset, sortColumn = 'created_at', sortOrder = 'DESC' }) {
  const conditions = ['organization_id = $1'];
  const values = [organizationId];
  let paramIdx = 2;

  if (email) {
    conditions.push(`email = $${paramIdx++}`);
    values.push(email);
  }

  if (username) {
    conditions.push(`username = $${paramIdx++}`);
    values.push(username);
  }

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(status);
  }

  // Whitelist sortColumn and sortOrder to strictly prevent SQL injection
  const allowedColumns = {
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'email': 'email',
    'username': 'username',
    'full_name': 'full_name',
    'status': 'status'
  };
  const safeColumn = allowedColumns[sortColumn] || 'created_at';
  const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT id, organization_id, email, username, full_name, status, created_at, updated_at,
           COUNT(*) OVER() AS total_count
    FROM users
    WHERE ${whereClause}
    ORDER BY ${safeColumn} ${safeOrder}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  values.push(limit, offset);

  const res = await query(sql, values);
  const rows = res.rows;
  const totalElements = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
  const content = rows.map(mapUserRow);

  return {
    content,
    totalElements
  };
}

async function updateUser(id, organizationId, fields) {
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  if (fields.email !== undefined) {
    setClauses.push(`email = $${paramIdx++}`);
    values.push(fields.email);
  }

  if (fields.username !== undefined) {
    setClauses.push(`username = $${paramIdx++}`);
    values.push(fields.username);
  }

  if (fields.fullName !== undefined) {
    setClauses.push(`full_name = $${paramIdx++}`);
    values.push(fields.fullName);
  }

  if (fields.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(fields.status);
  }

  if (setClauses.length === 0) {
    return findUserById(id, organizationId);
  }

  setClauses.push(`updated_at = now()`);

  const sql = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx++} AND organization_id = $${paramIdx++}
    RETURNING id, organization_id, email, username, full_name, status, created_at, updated_at;
  `;

  values.push(id, organizationId);

  const res = await query(sql, values);
  return mapUserRow(res.rows[0]);
}

module.exports = {
  createUser,
  findUserById,
  findUsers,
  updateUser,
  mapUserRow
};
