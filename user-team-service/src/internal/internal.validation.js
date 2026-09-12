const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');

const uuidSchema = z.string().uuid();

const lookupQuerySchema = z.object({
  organizationId: uuidSchema.optional(),
  organizationSlug: z.string().min(1).optional(),
  email: z.string().email(),
}).refine((value) => value.organizationId || value.organizationSlug, {
  path: ['organizationId'],
  message: 'organizationId query parameter is required',
});

const credentialBodySchema = z.object({
  passwordHash: z.string().min(1).optional(),
  plaintextPassword: z.string().min(1).optional(),
}).refine((value) => value.passwordHash || value.plaintextPassword, {
  path: ['plaintextPassword'],
  message: 'plaintextPassword is required',
});

const passwordUpdateBodySchema = z.object({
  passwordHash: z.string().min(1).optional(),
  newPlaintextPassword: z.string().min(1).optional(),
}).refine((value) => value.passwordHash || value.newPlaintextPassword, {
  path: ['newPlaintextPassword'],
  message: 'newPlaintextPassword is required',
});

function fieldErrorsFromZod(err) {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    code:
      issue.code === 'invalid_string' && (issue.validation === 'email' || issue.validation === 'uuid')
        ? 'INVALID_FORMAT'
        : 'INVALID_VALUE',
    message: issue.message,
  }));
}

function validateLookupQuery(req, res, next) {
  const parsed = lookupQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedQuery = parsed.data;
  return next();
}

function validateUserIdParam(req, res, next) {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  }
  return next();
}

function validateCredentialBody(req, res, next) {
  const parsed = credentialBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

function validatePasswordUpdateBody(req, res, next) {
  const parsed = passwordUpdateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

module.exports = {
  validateLookupQuery,
  validateUserIdParam,
  validateCredentialBody,
  validatePasswordUpdateBody,
};
