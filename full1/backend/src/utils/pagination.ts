export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface ParseOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  allowedSortFields?: string[];
}

/**
 * Parses raw Express query params into a safe, bounded pagination + sorting object.
 * Keeps controllers/services free of repetitive parsing/validation logic.
 */
export function parsePaginationQuery(
  query: Record<string, unknown>,
  options: ParseOptions = {},
): PaginationQuery {
  const {
    defaultLimit = 12,
    maxLimit = 50,
    defaultSortBy = 'createdAt',
    allowedSortFields = ['createdAt'],
  } = options;

  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit;

  const requestedSortBy = typeof query.sortBy === 'string' ? query.sortBy : defaultSortBy;
  const sortBy = allowedSortFields.includes(requestedSortBy) ? requestedSortBy : defaultSortBy;

  const sortOrder = query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : 'desc';

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder,
  };
}
