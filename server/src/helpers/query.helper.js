const { Op } = require("sequelize")

/**
 * Build search query for multiple fields
 * @param {string} search - Search term
 * @param {Array} fields - Fields to search in
 * @returns {Object} - Sequelize where clause
 */
exports.buildSearchQuery = (search, fields) => {
  if (!search || !fields || fields.length === 0) {
    return {}
  }

  const searchConditions = fields.map((field) => ({
    [field]: { [Op.like]: `%${search}%` },
  }))

  return {
    [Op.or]: searchConditions,
  }
}

/**
 * Build date range query
 * @param {string} field - Date field name
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} - Sequelize where clause
 */
exports.buildDateRangeQuery = (field, startDate, endDate) => {
  if (!field) {
    return {}
  }

  if (startDate && endDate) {
    return {
      [field]: {
        [Op.between]: [startDate, endDate],
      },
    }
  } else if (startDate) {
    return {
      [field]: {
        [Op.gte]: startDate,
      },
    }
  } else if (endDate) {
    return {
      [field]: {
        [Op.lte]: endDate,
      },
    }
  }

  return {}
}

/**
 * Build status query
 * @param {string} field - Status field name
 * @param {string|Array} status - Status value(s)
 * @returns {Object} - Sequelize where clause
 */
exports.buildStatusQuery = (field, status) => {
  if (!field || !status) {
    return {}
  }

  if (Array.isArray(status)) {
    return {
      [field]: {
        [Op.in]: status,
      },
    }
  }

  return {
    [field]: status,
  }
}

