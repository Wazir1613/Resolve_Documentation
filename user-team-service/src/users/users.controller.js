const { HttpError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const usersRepository = require('./users.repository');

function uniqueTakenError() {
  return new HttpError(409, 'USER_EMAIL_TAKEN', 'Email or username already exists in this organization');
}

async function createUser(req, res) {
  try {
    const user = await usersRepository.insertUser({
      organizationId: req.organizationId,
      email: req.validatedBody.email,
      username: req.validatedBody.username,
      fullName: req.validatedBody.fullName,
      status: req.validatedBody.status || 'ACTIVE',
    });
    res.status(201).json(user);
  } catch (err) {
    if (usersRepository.isUniqueViolation(err)) {
      throw uniqueTakenError();
    }
    throw err;
  }
}

const USER_SORT_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'email',
  'username',
  'full_name',
  'status',
]);

async function listUsers(req, res) {
  const pagination = parsePagination(req.query);
  const sortColumn = USER_SORT_COLUMNS.has(pagination.sortColumn)
    ? pagination.sortColumn
    : 'created_at';
  const { rows, totalElements } = await usersRepository.listUsers({
    organizationId: req.organizationId,
    email: req.query.email,
    username: req.query.username,
    status: req.query.status,
    limit: pagination.size,
    offset: pagination.offset,
    sortColumn,
    sortDirection: pagination.sortDirection,
  });

  res.status(200).json(
    paginatedResponse({
      content: rows,
      page: pagination.page,
      size: pagination.size,
      totalElements,
    })
  );
}

async function getUserById(req, res) {
  const user = await usersRepository.findByIdInOrg(req.params.id, req.organizationId);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  res.status(200).json(user);
}

async function patchUser(req, res) {
  const existing = await usersRepository.findByIdInOrg(req.params.id, req.organizationId);
  if (!existing) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }

  try {
    const user = await usersRepository.updateUser(req.params.id, req.organizationId, req.validatedBody);
    res.status(200).json(user);
  } catch (err) {
    if (usersRepository.isUniqueViolation(err)) {
      throw uniqueTakenError();
    }
    throw err;
  }
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  patchUser,
};
