const usersRepo = require('./users.repository');
const { parsePagination, formatPaginatedResponse } = require('../utils/pagination');
const { AppError } = require('../utils/errors');
const { UUID_REGEX } = require('./users.validation');

const ALLOWED_USER_SORT_FIELDS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  email: 'email',
  username: 'username',
  fullName: 'full_name',
  status: 'status'
};

async function createUser(req, res, next) {
  try {
    const { organizationId } = req.query;
    const { email, username, fullName, status } = req.body || {};

    // password_hash is deliberately ignored if passed
    const user = await usersRepo.createUser({
      organizationId,
      email,
      username,
      fullName,
      status: status || 'ACTIVE'
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { organizationId, email, username, status } = req.query;

    const { page, size, sortColumn, sortOrder, limit, offset } = parsePagination(
      req.query,
      ALLOWED_USER_SORT_FIELDS,
      'createdAt,desc'
    );

    const { content, totalElements } = await usersRepo.findUsers({
      organizationId,
      email,
      username,
      status,
      limit,
      offset,
      sortColumn,
      sortOrder
    });

    res.status(200).json(formatPaginatedResponse(content, page, size, totalElements));
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!UUID_REGEX.test(id) || !organizationId || !UUID_REGEX.test(organizationId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const user = await usersRepo.findUserById(id, organizationId);
    if (!user) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function patchUser(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!UUID_REGEX.test(id)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const existingUser = await usersRepo.findUserById(id, organizationId);
    if (!existingUser) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const { email, username, fullName, status } = req.body || {};

    const updatedUser = await usersRepo.updateUser(id, organizationId, {
      email,
      username,
      fullName,
      status
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  patchUser
};
