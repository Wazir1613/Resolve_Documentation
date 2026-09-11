// TEMPORARY: no auth enforced. Replace with real JWT validation once Authentication service exists.

const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { validateCreateUser, validateListUsers, validatePatchUser } = require('./users.validation');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.post('/', idempotencyMiddleware, validateCreateUser, usersController.createUser);
router.get('/', validateListUsers, usersController.listUsers);
router.get('/:id', usersController.getUserById);
router.patch('/:id', validatePatchUser, usersController.patchUser);

module.exports = router;
