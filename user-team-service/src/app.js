const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const usersRoutes = require('./users/users.routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-team-service' });
});

app.use('/api/v1/users', usersRoutes);

app.use(errorHandler);

module.exports = app;
