const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const { authenticate } = require('../middleware/authenticate');
const teamsController = require('./teams.controller');
const {
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
    authenticate,
    validateCreateTeam,
    asyncHandler(teamsController.createTeam)
);

router.get('/', authenticate, asyncHandler(teamsController.listTeams));

router.get(
    '/:id',
    authenticate,
    validateTeamIdParam,
    asyncHandler(teamsController.getTeamById)
);

router.patch(
    '/:id',
    authenticate,
    validateTeamIdParam,
    validatePatchTeam,
    asyncHandler(teamsController.patchTeam)
);

router.delete(
    '/:id',
    authenticate,
    validateTeamIdParam,
    asyncHandler(teamsController.deleteTeam)
);

router.post(
    '/:id/members',
    idempotencyMiddleware,
    authenticate,
    validateTeamIdParam,
    validateAddMember,
    asyncHandler(teamsController.addMember)
);

router.get(
    '/:id/members',
    authenticate,
    validateTeamIdParam,
    asyncHandler(teamsController.listMembers)
);

router.delete(
    '/:id/members/:userId',
    authenticate,
    validateTeamIdParam,
    validateMemberUserIdParam,
    asyncHandler(teamsController.deleteMember)
);

module.exports = router;