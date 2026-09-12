const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');

const uuidSchema = z.string().uuid();

const createTeamBodySchema = z.object({
  name: z.string().min(1).max(255),
});

const patchTeamBodySchema = z.object({
  name: z.string().min(1).max(255),
});

const addMemberBodySchema = z.object({
  userId: uuidSchema,
});

function fieldErrorsFromZod(err) {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    code: issue.code === 'invalid_string' && issue.validation === 'uuid' ? 'INVALID_FORMAT' : 'INVALID_VALUE',
    message: issue.message,
  }));
}

function requireOrganizationId(req, res, next) {
  const parsed = uuidSchema.safeParse(req.query.organizationId);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', [
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

function validateCreateTeam(req, res, next) {
  const parsed = createTeamBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

function validatePatchTeam(req, res, next) {
  const parsed = patchTeamBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

function validateAddMember(req, res, next) {
  const parsed = addMemberBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new HttpError(400, 'TEAM_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error))
    );
  }
  req.validatedBody = parsed.data;
  return next();
}

function validateTeamIdParam(req, res, next) {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    return next(new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found'));
  }
  return next();
}

function validateMemberUserIdParam(req, res, next) {
  const parsed = uuidSchema.safeParse(req.params.userId);
  if (!parsed.success) {
    return next(new HttpError(404, 'TEAM_MEMBER_NOT_FOUND', 'Team member not found'));
  }
  return next();
}

module.exports = {
  requireOrganizationId,
  validateCreateTeam,
  validatePatchTeam,
  validateAddMember,
  validateTeamIdParam,
  validateMemberUserIdParam,
};
