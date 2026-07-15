const nodemailer = require('nodemailer');
const { Setting } = require('../models');

async function sendEmail(toEmail, subject, bodyHtml) {
  try {
    const settings = await Setting.findOne();
    if (!settings || !settings.smtp_enabled) {
      console.log(`Email would be sent to ${toEmail}: ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_server,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const fromName = settings.smtp_from_name || 'MSO Fortbildungssystem';
    const info = await transporter.sendMail({
      from: `"${fromName}" <${settings.smtp_from_email}>`,
      to: toEmail,
      subject: subject,
      html: bodyHtml
    });

    console.log(`Email sent to ${toEmail}: ${subject} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
  }
}

module.exports = { sendEmail };
