const express = require('express');
const router = express.Router();
const teamsController = require('./teams.controller');
const { validateCreateTeam, validateListTeams, validatePatchTeam } = require('./teams.validation');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.post('/', idempotencyMiddleware, validateCreateTeam, teamsController.createTeam);
router.get('/', validateListTeams, teamsController.listTeams);
router.get('/:id', teamsController.getTeamById);
router.patch('/:id', validatePatchTeam, teamsController.patchTeam);
router.delete('/:id', teamsController.deleteTeam);

module.exports = router;
