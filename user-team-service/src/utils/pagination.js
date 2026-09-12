const ALLOWED_SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  email: 'email',
  username: 'username',
  fullName: 'full_name',
  name: 'name',
  status: 'status',
  joinedAt: 'joined_at',
};

function parsePagination(query) {
  const page = query.page === undefined || query.page === '' ? 0 : Number(query.page);
  const size = query.size === undefined || query.size === '' ? 20 : Number(query.size);
  const sortRaw = query.sort || 'createdAt,desc';
  const [sortFieldRaw, sortDirRaw] = String(sortRaw).split(',');
  const column = ALLOWED_SORT_COLUMNS[sortFieldRaw];
  const sortColumn = column || 'created_at';
  const direction = String(sortDirRaw || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
  const safeSize = Number.isInteger(size) && size > 0 && size <= 100 ? size : 20;

  return {
    page: safePage,
    size: safeSize,
    offset: safePage * safeSize,
    sortColumn,
    sortDirection: direction,
  };
}

function paginatedResponse({ content, page, size, totalElements }) {
  const totalPages = size === 0 ? 0 : Math.ceil(totalElements / size);
  return { content, page, size, totalElements, totalPages };
}

module.exports = { parsePagination, paginatedResponse };
