// TEMPORARY: no auth enforced. Replace with real JWT validation once Authentication service exists.
const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const teamsController = require('./teams.controller');
const {
  requireOrganizationId,
  validateCreateTeam,
  validatePatchTeam,
  validateAddMember,
  validateTeamIdParam,
  validateMemberUserIdParam,
} = require('./teams.validation');

const router = express.Router();

router.post(
  '/',
  idempotencyMiddleware,
  requireOrganizationId,
  validateCreateTeam,
  asyncHandler(teamsController.createTeam)
);

router.get('/', requireOrganizationId, asyncHandler(teamsController.listTeams));

router.get(
  '/:id',
  requireOrganizationId,
  validateTeamIdParam,
  asyncHandler(teamsController.getTeamById)
);

router.patch(
  '/:id',
  requireOrganizationId,
  validateTeamIdParam,
  validatePatchTeam,
  asyncHandler(teamsController.patchTeam)
);

router.delete(
  '/:id',
  requireOrganizationId,
  validateTeamIdParam,
  asyncHandler(teamsController.deleteTeam)
);

router.post(
  '/:id/members',
  idempotencyMiddleware,
  requireOrganizationId,
  validateTeamIdParam,
  validateAddMember,
  asyncHandler(teamsController.addMember)
);

router.get(
  '/:id/members',
  requireOrganizationId,
  validateTeamIdParam,
  asyncHandler(teamsController.listMembers)
);

router.delete(
  '/:id/members/:userId',
  requireOrganizationId,
  validateTeamIdParam,
  validateMemberUserIdParam,
  asyncHandler(teamsController.deleteMember)
);

module.exports = router;
