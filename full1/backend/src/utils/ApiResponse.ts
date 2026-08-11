export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ApiResponse<T = unknown> {
  public readonly success = true;
  public readonly message: string;
  public readonly data: T;
  public readonly meta?: PaginationMeta;

  constructor(message: string, data: T, meta?: PaginationMeta) {
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
