require('dotenv').config();

const app = require('./app');
const { pool } = require('./db/pool');
const { runMigrations } = require('./db/migrate');

const PORT = Number(process.env.PORT) || 8080;

async function start() {
  await runMigrations(pool);
  app.listen(PORT, () => {
    console.log(`User & Team Service listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
