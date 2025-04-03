/**
 * Create pagination metadata
 * @param {number} count - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
exports.createPaginationMeta = (count, page, limit) => {
    const totalPages = Math.ceil(count / limit)
  
    return {
      total: count,
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      totalPages,
    }
  }
  
  /**
   * Calculate offset from page and limit
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {number} - Offset
   */
  exports.calculateOffset = (page, limit) => {
    return (page - 1) * limit
  }
  
  