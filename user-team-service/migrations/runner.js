const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigrations(customPool = null) {
  const pool = customPool || new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // If flyway_schema_history exists, sync already-applied migrations into schema_migrations
    const flywayCheck = await client.query(`SELECT to_regclass('public.flyway_schema_history') AS exists;`);
    if (flywayCheck.rows[0].exists) {
      await client.query(`
        INSERT INTO schema_migrations (version)
        SELECT '001_create_users_table.sql' WHERE EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '1')
        ON CONFLICT (version) DO NOTHING;
      `);
      await client.query(`
        INSERT INTO schema_migrations (version)
        SELECT '002_create_teams_table.sql' WHERE EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '2')
        ON CONFLICT (version) DO NOTHING;
      `);
      await client.query(`
        INSERT INTO schema_migrations (version)
        SELECT '003_create_team_members_table.sql' WHERE EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '3')
        ON CONFLICT (version) DO NOTHING;
      `);
    }

    // Get applied migrations
    const res = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(res.rows.map(r => r.version));

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!applied.has(file)) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Successfully applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Failed to apply migration: ${file}`, err);
          throw err;
        }
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }
  } finally {
    client.release();
    if (!customPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('All migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
