const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const uuidSchema = z.string().uuid();

function normalize(value)
{
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

const emailSchema = z.preprocess(normalize, z.string().email());
const usernameSchema = z.preprocess(normalize, z.string().min(1).max(100));

const createUserBodySchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  fullName: z.string().min(1).max(255),
  status: z.enum(STATUSES).optional(),
});

const patchUserBodySchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
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
  validateCreateUser,
  validatePatchUser,
  validateUserIdParam,
};