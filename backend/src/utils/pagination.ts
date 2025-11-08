/**
 * Pagination Utilities
 * Provides safe pagination parameter validation
 */

export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Validate and sanitize pagination parameters
 * Prevents DoS attacks from excessive limit values and ensures valid ranges
 * 
 * @param limit - Requested number of items per page
 * @param offset - Requested offset (number of items to skip)
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Validated pagination parameters
 */
export function validatePagination(
  limit: number = 20,
  offset: number = 0,
  maxLimit: number = 100
): PaginationParams {
  // Ensure limit is a positive integer within bounds
  const validatedLimit = Math.min(
    Math.max(1, Math.floor(limit)),
    maxLimit
  );
  
  // Ensure offset is a non-negative integer
  const validatedOffset = Math.max(0, Math.floor(offset));
  
  return {
    limit: validatedLimit,
    offset: validatedOffset,
  };
}

/**
 * Calculate pagination metadata for API responses
 * 
 * @param total - Total number of items
 * @param limit - Items per page
 * @param offset - Current offset
 * @returns Pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  limit: number,
  offset: number
) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPreviousPage = offset > 0;
  
  return {
    total,
    limit,
    offset,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}
