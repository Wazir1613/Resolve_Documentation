const { pool } = require('../db/pool');

async function resetDatabase() {
  try {
    console.log('Truncating all tables (users, teams, team_members)...');
    await pool.query('TRUNCATE TABLE team_members, teams, users CASCADE;');
    console.log('All previous database entries successfully deleted. Database is completely fresh!');
  } catch (err) {
    console.error('Failed to truncate tables:', err);
  } finally {
    await pool.end();
  }
}

resetDatabase();
