const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const uuidSchema = z.string().uuid();

const createUserBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(100),
  fullName: z.string().min(1).max(255),
  status: z.enum(STATUSES).optional(),
});

const patchUserBodySchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).max(100).optional(),
  fullName: z.string().min(1).max(255).optional(),
  status: z.string().optional(),
});

function fieldErrorsFromZod(err) {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    code: issue.code === 'invalid_string' && issue.validation === 'email' ? 'INVALID_FORMAT' : 'INVALID_VALUE',
    message: issue.message,
  }));
}

function requireOrganizationId(req, res, next) {
  const parsed = uuidSchema.safeParse(req.query.organizationId);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', [
        {
          field: 'organizationId',
          code: 'INVALID_FORMAT',
          message: 'organizationId query parameter must be a valid UUID',
        },
      ])
    );
  }
  req.organizationId = parsed.data;
  return next();
}

function validateCreateUser(req, res, next) {
  const body = { ...req.body };
  delete body.password_hash;
  delete body.passwordHash;
  const parsed = createUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

function validatePatchUser(req, res, next) {
  const body = { ...req.body };
  delete body.password_hash;
  delete body.passwordHash;
  const parsed = patchUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  if (parsed.data.status !== undefined && !STATUSES.includes(parsed.data.status)) {
    return next(new HttpError(400, 'USER_INVALID_STATUS', 'status must be one of ACTIVE, INACTIVE, SUSPENDED'));
  }
  req.validatedBody = parsed.data;
  return next();
}

function validateUserIdParam(req, res, next) {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  }
  return next();
}

module.exports = {
  STATUSES,
  requireOrganizationId,
  validateCreateUser,
  validatePatchUser,
  validateUserIdParam,
};
