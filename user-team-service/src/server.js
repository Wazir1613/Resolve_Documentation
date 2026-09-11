require('dotenv').config();
const app = require('./app');
const { runMigrations } = require('../migrations/runner');
const { pool } = require('./db/pool');

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    console.log('Checking and running database migrations...');
    await runMigrations(pool);
    console.log('Database migrations successfully applied.');

    app.listen(PORT, () => {
      console.log(`User & Team Service is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
