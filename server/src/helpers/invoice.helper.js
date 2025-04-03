/**
 * Generate invoice (simplified)
 * @param {Object} payment - Payment object
 * @returns {Promise<string>} - Invoice URL
 */
exports.generateInvoice = async (payment) => {
    // In a real application, this would generate a PDF invoice
    // For this example, we'll just return a URL
    const invoiceId = `INV-${payment.id}-${Date.now()}`
    return `https://harmony.com/invoices/${invoiceId}`
  }
  
  