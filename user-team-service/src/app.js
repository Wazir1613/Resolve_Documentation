const express = require('express');
const crypto = require('crypto');
const { errorHandler } = require('./middleware/errorHandler');
const usersRoutes = require('./users/users.routes');
const teamsRoutes = require('./teams/teams.routes');
const internalRoutes = require('./internal/internal.routes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');

const app = express();
const swaggerDocument = YAML.load('./openapi.yaml');

app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

app.use((req, res, next) => {
  req.requestId = 'req_' + crypto.randomBytes(6).toString('hex');
  req.traceId = crypto.randomBytes(16).toString('hex');
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-team-service' });
});

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/teams', teamsRoutes);
app.use('/internal/v1', internalRoutes);

app.use(errorHandler);

module.exports = app;