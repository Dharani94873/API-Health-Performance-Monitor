const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendAlertEmail = async ({ to, apiName, message, timestamp }) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: `🚨 API Alert: ${apiName} is Down`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2>🚨 API Health Alert</h2>
          </div>
          <div style="background: #1f2937; color: #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
            <p><strong>API Name:</strong> ${apiName}</p>
            <p><strong>Alert:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
};

module.exports = { sendAlertEmail };
