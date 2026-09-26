const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const { authenticate } = require('../middleware/authenticate');
const usersController = require('./users.controller');
const {
  validateCreateUser,
  validatePatchUser,
  validateUserIdParam,
} = require('./users.validation');

const router = express.Router();

router.post(
    '/',
    idempotencyMiddleware,
    authenticate,
    validateCreateUser,
    asyncHandler(usersController.createUser)
);

router.get('/', authenticate, asyncHandler(usersController.listUsers));

router.get(
    '/:id',
    authenticate,
    validateUserIdParam,
    asyncHandler(usersController.getUserById)
);

router.patch(
    '/:id',
    authenticate,
    validateUserIdParam,
    validatePatchUser,
    asyncHandler(usersController.patchUser)
);

router.delete(
    '/:id',
    authenticate,
    validateUserIdParam,
    asyncHandler(usersController.deactivateUser)
);

module.exports = router;