// src/scripts/psqlView.js
// Executes a raw SQL statement against the PostgreSQL container using psql.
// Usage: npm run db:psql -- "<SQL statement>"
// Example: npm run db:psql -- "SELECT * FROM users ORDER BY created_at;"

const { execSync } = require('child_process');

// Grab everything after the '--' separator passed to npm run
const sql = process.argv.slice(2).join(' ');
if (!sql) {
  console.error('Usage: npm run db:psql -- "<SQL>"');
  process.exit(1);
}

try {
  // Run psql inside the Docker container named 'user-team-postgres'
  execSync(`docker exec -i user-team-postgres psql -U resolve -d userteamdb -c "${sql}"`, { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}
