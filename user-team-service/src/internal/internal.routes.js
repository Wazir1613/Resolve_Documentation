// TEMPORARY: no auth enforced. Replace with service-to-service auth once Authentication service exists.
const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const internalController = require('./internal.controller');
const {
  validateLookupQuery,
  validateUserIdParam,
  validateCredentialBody,
  validatePasswordUpdateBody,
} = require('./internal.validation');

const router = express.Router();

router.get(
  '/users/lookup',
  validateLookupQuery,
  asyncHandler(internalController.lookupUser)
);

router.post(
  '/users/:id/verify-credentials',
  validateUserIdParam,
  validateCredentialBody,
  asyncHandler(internalController.verifyCredentials)
);

router.patch(
  '/users/:id/password-hash',
  validateUserIdParam,
  validatePasswordUpdateBody,
  asyncHandler(internalController.patchPasswordHash)
);

router.get(
  '/users/:id',
  validateUserIdParam,
  asyncHandler(internalController.getInternalUser)
);

module.exports = router;
