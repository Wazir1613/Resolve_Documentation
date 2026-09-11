function parsePagination(query, allowedSortFields = {}, defaultSort = 'createdAt,desc') {
  const page = Math.max(0, parseInt(query.page, 10) || 0);
  const size = Math.max(1, parseInt(query.size, 10) || 20);

  const sortStr = query.sort || defaultSort;
  const [field, direction] = sortStr.split(',');

  const sortOrder = direction && direction.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortColumn = allowedSortFields[field] || allowedSortFields['createdAt'] || 'created_at';

  const offset = page * size;
  const limit = size;

  return {
    page,
    size,
    sortColumn,
    sortOrder,
    offset,
    limit
  };
}

function formatPaginatedResponse(content, page, size, totalElements) {
  const total = parseInt(totalElements, 10) || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / size);

  return {
    content,
    page,
    size,
    totalElements: total,
    totalPages
  };
}

module.exports = {
  parsePagination,
  formatPaginatedResponse
};
