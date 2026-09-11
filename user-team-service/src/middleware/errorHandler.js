const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || null;

  // Handle Postgres Unique Constraint Violations (error code 23505)
  if (err.code === '23505') {
    status = 409;
    if (err.constraint === 'uq_users_org_email' || err.constraint === 'uq_users_org_username') {
      code = 'USER_EMAIL_TAKEN';
      message = 'User with this email or username already exists in this organization';
    } else if (err.constraint === 'uq_teams_org_name') {
      code = 'TEAM_NAME_TAKEN';
      message = 'Team with this name already exists in this organization';
    } else if (err.constraint === 'team_members_pkey') {
      code = 'TEAM_MEMBER_ALREADY_EXISTS';
      message = 'User is already a member of this team';
    } else {
      code = 'RESOURCE_CONFLICT';
      message = 'Unique constraint violation';
    }
  }

  // Handle invalid UUID syntax from Postgres
  if (err.code === '22P02' && err.message && err.message.includes('uuid')) {
    // If querying a resource by invalid UUID, return 404
    status = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  // Generate ISO 8601 UTC timestamp
  const timestamp = new Date().toISOString();
  const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;

  const responseBody = {
    timestamp,
    status,
    code,
    message,
    path
  };

  // The errors array only appears on 400 field-validation failures; omit it otherwise
  if (status === 400 && errors && Array.isArray(errors) && errors.length > 0) {
    responseBody.errors = errors;
  }

  res.status(status).json(responseBody);
}

module.exports = { errorHandler };
