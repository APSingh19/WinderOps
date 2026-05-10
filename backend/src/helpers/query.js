const allowedSortFields = new Set(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'position', 'name']);

export const getPagination = (query, defaults = {}) => {
  const page = Math.max(Number(query.page || defaults.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || defaults.limit || 25), 1), defaults.maxLimit || 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const getSort = (query, fallback = '-updatedAt') => {
  const requested = String(query.sort || fallback);
  const direction = requested.startsWith('-') ? -1 : 1;
  const field = requested.replace(/^-/, '');
  return allowedSortFields.has(field) ? { [field]: direction } : { updatedAt: -1 };
};
