const teamsRepo = require('./teams.repository');
const { parsePagination, formatPaginatedResponse } = require('../utils/pagination');
const { AppError } = require('../utils/errors');
const { UUID_REGEX } = require('../users/users.validation');

const ALLOWED_TEAM_SORT_FIELDS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  name: 'name'
};

async function createTeam(req, res, next) {
  try {
    const { organizationId } = req.query;
    const { name } = req.body;

    const team = await teamsRepo.createTeam({
      organizationId,
      name: name.trim()
    });

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

async function listTeams(req, res, next) {
  try {
    const { organizationId, name } = req.query;

    const { page, size, sortColumn, sortOrder, limit, offset } = parsePagination(
      req.query,
      ALLOWED_TEAM_SORT_FIELDS,
      'createdAt,desc'
    );

    const { content, totalElements } = await teamsRepo.findTeams({
      organizationId,
      name,
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

async function getTeamById(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!UUID_REGEX.test(id) || !organizationId || !UUID_REGEX.test(organizationId)) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    const team = await teamsRepo.findTeamById(id, organizationId);
    if (!team) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    res.status(200).json(team);
  } catch (err) {
    next(err);
  }
}

async function patchTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!UUID_REGEX.test(id)) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    const existingTeam = await teamsRepo.findTeamById(id, organizationId);
    if (!existingTeam) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    const { name } = req.body;
    const updatedTeam = await teamsRepo.updateTeam(id, organizationId, {
      name: name.trim()
    });

    res.status(200).json(updatedTeam);
  } catch (err) {
    next(err);
  }
}

async function deleteTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!UUID_REGEX.test(id) || !organizationId || !UUID_REGEX.test(organizationId)) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    const deleted = await teamsRepo.deleteTeam(id, organizationId);
    if (!deleted) {
      return next(new AppError(404, 'TEAM_NOT_FOUND', 'Team not found'));
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTeam,
  listTeams,
  getTeamById,
  patchTeam,
  deleteTeam
};
