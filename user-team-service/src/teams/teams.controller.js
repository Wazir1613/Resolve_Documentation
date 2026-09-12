const { HttpError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const teamsRepository = require('./teams.repository');

function teamNameTakenError() {
  return new HttpError(409, 'TEAM_NAME_TAKEN', 'Team name already exists in this organization');
}

function teamNotFoundError() {
  return new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
}

const TEAM_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'name']);

async function createTeam(req, res) {
  try {
    const team = await teamsRepository.insertTeam({
      organizationId: req.organizationId,
      name: req.validatedBody.name,
    });
    res.status(201).json(team);
  } catch (err) {
    if (teamsRepository.isUniqueViolation(err)) {
      throw teamNameTakenError();
    }
    throw err;
  }
}

async function listTeams(req, res) {
  const pagination = parsePagination(req.query);
  const sortColumn = TEAM_SORT_COLUMNS.has(pagination.sortColumn)
    ? pagination.sortColumn
    : 'created_at';

  const { rows, totalElements } = await teamsRepository.listTeams({
    organizationId: req.organizationId,
    name: req.query.name,
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

async function getTeamById(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) {
    throw teamNotFoundError();
  }
  res.status(200).json(team);
}

async function patchTeam(req, res) {
  const existing = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!existing) {
    throw teamNotFoundError();
  }

  try {
    const team = await teamsRepository.updateTeamName(req.params.id, req.organizationId, req.validatedBody.name);
    res.status(200).json(team);
  } catch (err) {
    if (teamsRepository.isUniqueViolation(err)) {
      throw teamNameTakenError();
    }
    throw err;
  }
}

async function deleteTeam(req, res) {
  const deleted = await teamsRepository.deleteTeam(req.params.id, req.organizationId);
  if (!deleted) {
    throw teamNotFoundError();
  }
  res.status(204).send();
}

async function addMember(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) {
    throw teamNotFoundError();
  }

  const user = await teamsRepository.findUserByIdInOrg(req.validatedBody.userId, req.organizationId);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }

  try {
    const member = await teamsRepository.addMember(req.params.id, req.validatedBody.userId);
    res.status(201).json(member);
  } catch (err) {
    if (teamsRepository.isUniqueViolation(err)) {
      throw new HttpError(409, 'TEAM_MEMBER_ALREADY_EXISTS', 'Team member already exists');
    }
    throw err;
  }
}

async function listMembers(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) {
    throw teamNotFoundError();
  }

  const pagination = parsePagination(req.query);
  const { rows, totalElements } = await teamsRepository.listMembers({
    teamId: req.params.id,
    limit: pagination.size,
    offset: pagination.offset,
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

async function deleteMember(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) {
    throw teamNotFoundError();
  }

  const deleted = await teamsRepository.removeMember(req.params.id, req.params.userId);
  if (!deleted) {
    throw new HttpError(404, 'TEAM_MEMBER_NOT_FOUND', 'Team member not found');
  }

  res.status(204).send();
}

module.exports = {
  createTeam,
  listTeams,
  getTeamById,
  patchTeam,
  deleteTeam,
  addMember,
  listMembers,
  deleteMember,
};
