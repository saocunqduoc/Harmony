/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
exports.formatDate = (date) => {
    return date.toISOString().split("T")[0]
  }
  
  /**
   * Format time to HH:MM
   * @param {Date} date - Date to format
   * @returns {string} - Formatted time
   */
  exports.formatTime = (date) => {
    return date.toTimeString().split(" ")[0].substring(0, 5)
  }
  
  /**
   * Get start and end of day
   * @param {Date} date - Date
   * @returns {Object} - Start and end of day
   */
  exports.getDayBoundaries = (date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
  
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
  
    return { startOfDay, endOfDay }
  }
  
  /**
   * Get start and end of month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Object} - Start and end of month
   */
  exports.getMonthBoundaries = (year, month) => {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
  
    return { startOfMonth, endOfMonth }
  }
  
  