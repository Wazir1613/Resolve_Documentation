const { pool } = require('../db/pool');

const TEAM_COLUMNS = `
  id,
  organization_id,
  name,
  created_at,
  updated_at
`;

function toTeam(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTeamMember(row) {
  if (!row) {
    return null;
  }
  return {
    teamId: row.team_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
  };
}

function toTeamMemberUser(row) {
  if (!row) {
    return null;
  }
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    joinedAt: row.joined_at,
  };
}

function isUniqueViolation(err) {
  return err && err.code === '23505';
}

async function insertTeam({ organizationId, name }) {
  const result = await pool.query(
    `INSERT INTO teams (organization_id, name)
     VALUES ($1, $2)
     RETURNING ${TEAM_COLUMNS}`,
    [organizationId, name]
  );
  return toTeam(result.rows[0]);
}

async function findTeamByIdInOrg(id, organizationId) {
  const result = await pool.query(
    `SELECT ${TEAM_COLUMNS}
     FROM teams
     WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return toTeam(result.rows[0]);
}

async function listTeams({ organizationId, name, limit, offset, sortColumn, sortDirection }) {
  const conditions = ['organization_id = $1'];
  const params = [organizationId];

  if (name) {
    params.push(name);
    conditions.push(`name = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM teams WHERE ${where}`,
    params
  );

  params.push(limit, offset);
  const listResult = await pool.query(
    `SELECT ${TEAM_COLUMNS}
     FROM teams
     WHERE ${where}
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    rows: listResult.rows.map(toTeam),
    totalElements: countResult.rows[0].total,
  };
}

async function updateTeamName(id, organizationId, name) {
  const result = await pool.query(
    `UPDATE teams
     SET name = $1, updated_at = now()
     WHERE id = $2 AND organization_id = $3
     RETURNING ${TEAM_COLUMNS}`,
    [name, id, organizationId]
  );
  return toTeam(result.rows[0]);
}

async function deleteTeam(id, organizationId) {
  const result = await pool.query(
    `DELETE FROM teams
     WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
  return result.rowCount > 0;
}

async function findUserByIdInOrg(userId, organizationId) {
  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
  return result.rows[0] || null;
}

async function addMember(teamId, userId) {
  const result = await pool.query(
    `INSERT INTO team_members (team_id, user_id)
     VALUES ($1, $2)
     RETURNING team_id, user_id, joined_at`,
    [teamId, userId]
  );
  return toTeamMember(result.rows[0]);
}

async function listMembers({ teamId, limit, offset }) {
  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM team_members WHERE team_id = $1',
    [teamId]
  );

  const listResult = await pool.query(
    `SELECT tm.user_id, u.full_name, u.email, tm.joined_at
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY tm.joined_at DESC
     LIMIT $2 OFFSET $3`,
    [teamId, limit, offset]
  );

  return {
    rows: listResult.rows.map(toTeamMemberUser),
    totalElements: countResult.rows[0].total,
  };
}

async function removeMember(teamId, userId) {
  const result = await pool.query(
    `DELETE FROM team_members
     WHERE team_id = $1 AND user_id = $2`,
    [teamId, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  insertTeam,
  findTeamByIdInOrg,
  listTeams,
  updateTeamName,
  deleteTeam,
  findUserByIdInOrg,
  addMember,
  listMembers,
  removeMember,
  isUniqueViolation,
};
