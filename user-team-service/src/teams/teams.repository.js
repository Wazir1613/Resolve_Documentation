const { query } = require('../db/pool');

function mapTeamRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createTeam({ organizationId, name }) {
  const sql = `
    INSERT INTO teams (organization_id, name)
    VALUES ($1, $2)
    RETURNING id, organization_id, name, created_at, updated_at;
  `;
  const res = await query(sql, [organizationId, name]);
  return mapTeamRow(res.rows[0]);
}

async function findTeamById(id, organizationId) {
  const sql = `
    SELECT id, organization_id, name, created_at, updated_at
    FROM teams
    WHERE id = $1 AND organization_id = $2;
  `;
  const res = await query(sql, [id, organizationId]);
  return mapTeamRow(res.rows[0]);
}

async function findTeams({ organizationId, name, limit, offset, sortColumn = 'created_at', sortOrder = 'DESC' }) {
  const conditions = ['organization_id = $1'];
  const values = [organizationId];
  let paramIdx = 2;

  if (name) {
    conditions.push(`name ILIKE $${paramIdx++}`);
    values.push(`%${name}%`);
  }

  const allowedColumns = {
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'name': 'name'
  };
  const safeColumn = allowedColumns[sortColumn] || 'created_at';
  const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT id, organization_id, name, created_at, updated_at,
           COUNT(*) OVER() AS total_count
    FROM teams
    WHERE ${whereClause}
    ORDER BY ${safeColumn} ${safeOrder}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  values.push(limit, offset);

  const res = await query(sql, values);
  const rows = res.rows;
  const totalElements = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
  const content = rows.map(mapTeamRow);

  return {
    content,
    totalElements
  };
}

async function updateTeam(id, organizationId, { name }) {
  const sql = `
    UPDATE teams
    SET name = $1, updated_at = now()
    WHERE id = $2 AND organization_id = $3
    RETURNING id, organization_id, name, created_at, updated_at;
  `;
  const res = await query(sql, [name, id, organizationId]);
  return mapTeamRow(res.rows[0]);
}

async function deleteTeam(id, organizationId) {
  const sql = `
    DELETE FROM teams
    WHERE id = $1 AND organization_id = $2
    RETURNING id;
  `;
  const res = await query(sql, [id, organizationId]);
  return res.rowCount > 0;
}

module.exports = {
  createTeam,
  findTeamById,
  findTeams,
  updateTeam,
  deleteTeam,
  mapTeamRow
};
