const { AppError } = require('../utils/errors');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

function validateCreateUser(req, res, next) {
  const errors = [];
  const { organizationId } = req.query;
  const { email, username, fullName, status } = req.body || {};

  if (!organizationId) {
    errors.push({ field: 'organizationId', code: 'REQUIRED', message: 'organizationId query parameter is required' });
  } else if (!UUID_REGEX.test(organizationId)) {
    errors.push({ field: 'organizationId', code: 'INVALID_FORMAT', message: 'organizationId must be a valid UUID' });
  }

  if (!email) {
    errors.push({ field: 'email', code: 'REQUIRED', message: 'email is required' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', code: 'INVALID_FORMAT', message: 'email must be a valid email address' });
  }

  if (!username) {
    errors.push({ field: 'username', code: 'REQUIRED', message: 'username is required' });
  } else if (typeof username !== 'string' || username.trim() === '') {
    errors.push({ field: 'username', code: 'INVALID_FORMAT', message: 'username must not be empty' });
  }

  if (!fullName) {
    errors.push({ field: 'fullName', code: 'REQUIRED', message: 'fullName is required' });
  } else if (typeof fullName !== 'string' || fullName.length > 255) {
    errors.push({ field: 'fullName', code: 'INVALID_LENGTH', message: 'fullName must not exceed 255 characters' });
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push({ field: 'status', code: 'INVALID_VALUE', message: 'status must be one of ACTIVE, INACTIVE, SUSPENDED' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

function validateListUsers(req, res, next) {
  const errors = [];
  const { organizationId } = req.query;

  if (!organizationId) {
    errors.push({ field: 'organizationId', code: 'REQUIRED', message: 'organizationId query parameter is required' });
  } else if (!UUID_REGEX.test(organizationId)) {
    errors.push({ field: 'organizationId', code: 'INVALID_FORMAT', message: 'organizationId must be a valid UUID' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

function validatePatchUser(req, res, next) {
  const { organizationId } = req.query;
  const { status, email, fullName } = req.body || {};

  if (!organizationId || !UUID_REGEX.test(organizationId)) {
    return next(new AppError(400, 'USER_VALIDATION_ERROR', 'organizationId query parameter is required and must be a valid UUID', [
      { field: 'organizationId', code: organizationId ? 'INVALID_FORMAT' : 'REQUIRED', message: 'organizationId is required and must be a valid UUID' }
    ]));
  }

  // Explicit requirement: 400 — USER_INVALID_STATUS if status isn't one of the 3 valid values
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return next(new AppError(400, 'USER_INVALID_STATUS', "Status must be one of 'ACTIVE', 'INACTIVE', or 'SUSPENDED'"));
  }

  const errors = [];
  if (email !== undefined) {
    if (!EMAIL_REGEX.test(email)) {
      errors.push({ field: 'email', code: 'INVALID_FORMAT', message: 'email must be a valid email address' });
    }
  }

  if (fullName !== undefined && (typeof fullName !== 'string' || fullName.length > 255)) {
    errors.push({ field: 'fullName', code: 'INVALID_LENGTH', message: 'fullName must not exceed 255 characters' });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', errors));
  }

  next();
}

module.exports = {
  validateCreateUser,
  validateListUsers,
  validatePatchUser,
  UUID_REGEX
};
