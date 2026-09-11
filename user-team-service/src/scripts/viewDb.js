const { pool } = require('../db/pool');

async function viewDatabase() {
  try {
    console.log('\n========================= USERS TABLE =========================');
    const usersRes = await pool.query(`
      SELECT id, organization_id, email, username, full_name, status, created_at 
      FROM users 
      ORDER BY created_at DESC;
    `);
    if (usersRes.rows.length === 0) {
      console.log('No users found in database.');
    } else {
      console.table(usersRes.rows);
    }

    console.log('\n========================= TEAMS TABLE =========================');
    const teamsRes = await pool.query(`
      SELECT id, organization_id, name, created_at 
      FROM teams 
      ORDER BY created_at DESC;
    `);
    if (teamsRes.rows.length === 0) {
      console.log('No teams found in database.');
    } else {
      console.table(teamsRes.rows);
    }

    console.log('\n====================== TEAM MEMBERS TABLE =====================');
    const membersRes = await pool.query(`
      SELECT team_id, user_id, joined_at 
      FROM team_members 
      ORDER BY joined_at DESC;
    `);
    if (membersRes.rows.length === 0) {
      console.log('No team members found in database.');
    } else {
      console.table(membersRes.rows);
    }
  } catch (err) {
    console.error('Failed to query database:', err);
  } finally {
    await pool.end();
  }
}

viewDatabase();
