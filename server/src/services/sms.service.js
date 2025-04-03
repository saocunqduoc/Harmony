const twilio = require("twilio")
const logger = require("../utils/logger")

class SmsService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER
  }

  async sendSms(to, body) {
    try {
      const phoneNumber  = `+84${to.slice(1)}`; // Thêm +84 vào đầu số điện thoại
      const message = await this.client.messages.create({
        body,
        from: this.phoneNumber,
        to: phoneNumber,
      })

      logger.info(`SMS sent to ${to}`, { messageId: message.sid })
      return message
    } catch (error) {
      logger.error("Error sending SMS", { error, to, body })
      throw error
    }
  }

  async sendBookingConfirmation(user, booking, business) {
    const body = `
      Harmony: Your booking at ${business.name} has been confirmed.
      Date: ${booking.booking_date}
      Time: ${booking.booking_time}
      Thank you for choosing Harmony!
    `

    return this.sendSms(user.phone, body)
  }

  async sendBookingReminder(user, booking, business) {
    const body = `
      Harmony: Reminder for your appointment at ${business.name} tomorrow at ${booking.booking_time}.
      We look forward to seeing you!
    `

    return this.sendSms(user.phone, body)
  }

  async sendPasswordResetCode(user, code) {
    const body = `
      Harmony: Your password reset code is ${code}. This code will expire in 5 minutes.
    `
    return this.sendSms(user.phone, body)
  }
}

module.exports = new SmsService()

