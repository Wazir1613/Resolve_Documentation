const { AppError } = require('../utils/errors');
const { UUID_REGEX } = require('../users/users.validation');

function validateCreateTeam(req, res, next) {
  const errors = [];
  const { organizationId } = req.query;
  const { name } = req.body || {};

  if (!organizationId) {
    errors.push({ field: 'organizationId', code: 'REQUIRED', message: 'organizationId query parameter is required' });
  } else if (!UUID_REGEX.test(organizationId)) {
    errors.push({ field: 'organizationId', code: 'INVALID_FORMAT', message: 'organizationId must be a valid UUID' });
  }

  if (!name) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'name is required' });
  } else if (typeof name !== 'string' || name.trim() === '') {
    errors.push({ field: 'name', code: 'INVALID_FORMAT', message: 'name must not be empty' });
  } else if (name.length > 255) {
    errors.push({ field: 'name', code: 'INVALID_LENGTH', message: 'name must not exceed 255 characters' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

function validateListTeams(req, res, next) {
  const errors = [];
  const { organizationId } = req.query;

  if (!organizationId) {
    errors.push({ field: 'organizationId', code: 'REQUIRED', message: 'organizationId query parameter is required' });
  } else if (!UUID_REGEX.test(organizationId)) {
    errors.push({ field: 'organizationId', code: 'INVALID_FORMAT', message: 'organizationId must be a valid UUID' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

function validatePatchTeam(req, res, next) {
  const errors = [];
  const { organizationId } = req.query;
  const { name } = req.body || {};

  if (!organizationId) {
    errors.push({ field: 'organizationId', code: 'REQUIRED', message: 'organizationId query parameter is required' });
  } else if (!UUID_REGEX.test(organizationId)) {
    errors.push({ field: 'organizationId', code: 'INVALID_FORMAT', message: 'organizationId must be a valid UUID' });
  }

  if (!name) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'name is required' });
  } else if (typeof name !== 'string' || name.trim() === '') {
    errors.push({ field: 'name', code: 'INVALID_FORMAT', message: 'name must not be empty' });
  } else if (name.length > 255) {
    errors.push({ field: 'name', code: 'INVALID_LENGTH', message: 'name must not exceed 255 characters' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

module.exports = {
  validateCreateTeam,
  validateListTeams,
  validatePatchTeam
};
