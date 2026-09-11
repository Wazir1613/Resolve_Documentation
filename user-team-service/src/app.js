const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError } = require('./utils/errors');
const usersRouter = require('./users/users.routes');
const teamsRouter = require('./teams/teams.routes');

const app = express();

app.use(express.json());

// Public endpoints
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/teams', teamsRouter);

// 404 handler for undefined routes
app.use((req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized error handler
app.use(errorHandler);

if (require.main === module) {
  const { startServer } = require('./server');
  startServer();
}

module.exports = app;
