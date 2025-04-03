const SibApiV3Sdk = require("sib-api-v3-sdk")
const logger = require("../utils/logger")

class EmailService {
  constructor() {

    this.client = SibApiV3Sdk.ApiClient.instance

    const apiKey = this.client.authentications["api-key"]
    apiKey.apiKey = process.env.BREVO_API_KEY

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
    this.sender = {
      name: process.env.EMAIL_SENDER_NAME || "Harmony",
      email: process.env.EMAIL_SENDER_ADDRESS || "dev.nguyenvanlinh@gmail.com",
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!textContent) {
        textContent = htmlContent.replace(/<[^>]*>?/gm, ""); // Chuyển HTML thành text
    }

    try {
        const sendSmtpEmail = {
            sender: this.sender,
            to: [{ email: to }],
            subject,
            htmlContent,
            textContent, // Đã đảm bảo có giá trị
        };

        const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
        logger.info(`Email sent to ${to}`, { messageId: result.messageId });
        return result;
    } catch (error) {
        logger.error("Error sending email", { error, to, subject });
        throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = "Welcome to Harmony"
    const htmlContent = `
      <h1>Welcome to Harmony, ${user.name}!</h1>
      <p>Thank you for joining our platform. We're excited to have you with us.</p>
      <p>You can now book services or manage your business on our platform.</p>
      <p>Best regards,<br>The Harmony Team</p>
    `

    return this.sendEmail(user.email, subject, htmlContent)
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    const subject = "Password Reset Request"
    const htmlContent = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 5 minutes.</p>
      <p>Best regards,<br>The Harmony Team</p>
    `

    return this.sendEmail(user.email, subject, htmlContent)
  }

  async sendBookingConfirmation(user, booking, business) {
    const subject = "Booking Confirmation"
    const htmlContent = `
      <h1>Booking Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your booking at ${business.name} has been confirmed.</p>
      <p>Date: ${booking.booking_date}</p>
      <p>Time: ${booking.booking_time}</p>
      <p>Thank you for choosing Harmony!</p>
      <p>Best regards,<br>The Harmony Team</p>
    `

    return this.sendEmail(user.email, subject, htmlContent)
  }

  async sendInvoice(user, payment, invoice) {
    const subject = "Your Invoice"
    const htmlContent = `
      <h1>Invoice</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for your payment. Please find your invoice attached.</p>
      <p>Amount: $${payment.amount}</p>
      <p>Date: ${payment.created_at}</p>
      <p>You can view your invoice <a href="${invoice.invoice_url}">here</a>.</p>
      <p>Best regards,<br>The Harmony Team</p>
    `

    return this.sendEmail(user.email, subject, htmlContent)
  }
}

module.exports = new EmailService()

