const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const usersRoutes = require('./users/users.routes');
const teamsRoutes = require('./teams/teams.routes');
const internalRoutes = require('./internal/internal.routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-team-service' });
});

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/teams', teamsRoutes);
app.use('/internal/v1', internalRoutes);

app.use(errorHandler);

module.exports = app;
