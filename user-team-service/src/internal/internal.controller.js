const bcrypt = require('bcryptjs');
const { HttpError } = require('../middleware/errorHandler');
const usersRepository = require('../users/users.repository');

const SALT_ROUNDS = 10;

function userNotFoundError() {
  return new HttpError(404, 'USER_NOT_FOUND', 'User not found');
}

async function lookupUser(req, res) {
  // TODO: production should call Organization Service before this endpoint when only a slug is available.
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
  const user = await usersRepository.findCredentialRecordById(req.params.id);
  if (!user || !user.passwordHash) {
    throw userNotFoundError();
  }

  const valid = await bcrypt.compare(req.validatedBody.plaintextPassword, user.passwordHash);

  res.status(200).json({
    valid,
    status: user.status,
    organizationId: user.organizationId,
  });
}

async function patchPasswordHash(req, res) {
  const hash = await bcrypt.hash(req.validatedBody.newPlaintextPassword, SALT_ROUNDS);
  const updated = await usersRepository.updatePasswordHash(req.params.id, hash);
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