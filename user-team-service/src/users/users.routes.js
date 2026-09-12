// TEMPORARY: no auth enforced. Replace with real JWT validation once Authentication service exists.
const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const usersController = require('./users.controller');
const {
  requireOrganizationId,
  validateCreateUser,
  validatePatchUser,
  validateUserIdParam,
} = require('./users.validation');

const router = express.Router();

router.post(
  '/',
  idempotencyMiddleware,
  requireOrganizationId,
  validateCreateUser,
  asyncHandler(usersController.createUser)
);

router.get('/', requireOrganizationId, asyncHandler(usersController.listUsers));

router.get(
  '/:id',
  requireOrganizationId,
  validateUserIdParam,
  asyncHandler(usersController.getUserById)
);

router.patch(
  '/:id',
  requireOrganizationId,
  validateUserIdParam,
  validatePatchUser,
  asyncHandler(usersController.patchUser)
);

module.exports = router;
