const { HttpError } = require('../middleware/errorHandler');
const usersRepository = require('../users/users.repository');

function userNotFoundError() {
  return new HttpError(404, 'USER_NOT_FOUND', 'User not found');
}

async function lookupUser(req, res) {
  // TODO: production should call Organization Service before this endpoint when only a slug is available.
  // Local compatibility: organizationSlug is treated as the textual organization_id value.
  const user = await usersRepository.findForInternalLookup({
    organizationId: req.validatedQuery.organizationId || req.validatedQuery.organizationSlug,
    email: req.validatedQuery.email,
  });
  if (!user) {
    throw userNotFoundError();
  }
  res.status(200).json({ userId: user.id, status: user.status });
}

async function verifyCredentials(req, res) {
  // TODO: replace this local string equality check with the agreed bcrypt/argon2 boundary once Authentication lands.
  const user = await usersRepository.findCredentialRecordById(req.params.id);
  if (!user) {
    throw userNotFoundError();
  }
  const provided = req.validatedBody.plaintextPassword || req.validatedBody.passwordHash;
  if (req.validatedBody.passwordHash) {
    res.status(200).json({ match: user.passwordHash === provided });
    return;
  }
  res.status(200).json({
    valid: user.passwordHash === provided,
    status: user.status,
    organizationId: user.organizationId,
  });
}

async function patchPasswordHash(req, res) {
  const password = req.validatedBody.newPlaintextPassword || req.validatedBody.passwordHash;
  const updated = await usersRepository.updatePasswordHash(req.params.id, password);
  if (!updated) {
    throw userNotFoundError();
  }
  res.status(204).send();
}

async function getInternalUser(req, res) {
  const user = await usersRepository.findInternalStatusById(req.params.id);
  if (!user) {
    throw userNotFoundError();
  }
  res.status(200).json(user);
}

module.exports = {
  lookupUser,
  verifyCredentials,
  patchPasswordHash,
  getInternalUser,
};
