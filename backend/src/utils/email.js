const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
};

// Email Templates
const emailTemplates = {
  passwordReset: (name, resetUrl) => ({
    subject: 'Reset Your Password - Complaint Tracker',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 40px 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 40px 32px; }
          .body p { color: #374151; line-height: 1.7; margin: 0 0 16px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
          .note { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0; }
          .note p { color: #6b7280; font-size: 13px; margin: 0; }
          .footer { padding: 24px 32px; border-top: 1px solid #f3f4f6; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Complaint Tracker System</p>
          </div>
          <div class="body">
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset the password for your Complaint Tracker account. Click the button below to set a new password:</p>
            <p style="text-align:center; margin: 32px 0;">
              <a href="${resetUrl}" class="btn">Reset My Password</a>
            </p>
            <div class="note">
              <p>⏰ This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your account is safe.</p>
            </div>
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5; font-size: 13px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Complaint Tracker. This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  complaintCreated: (name, complaintNumber, title) => ({
    subject: `Complaint ${complaintNumber} Registered - Complaint Tracker`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 40px 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
          .body { padding: 40px 32px; }
          .body p { color: #374151; line-height: 1.7; margin: 0 0 16px; }
          .badge { background: #eef2ff; color: #4f46e5; font-weight: 700; font-size: 18px; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 8px 0; }
          .footer { padding: 24px 32px; border-top: 1px solid #f3f4f6; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Complaint Registered</h1>
          </div>
          <div class="body">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your complaint has been successfully registered. Here are your details:</p>
            <p><strong>Complaint ID:</strong><br><span class="badge">${complaintNumber}</span></p>
            <p><strong>Subject:</strong> ${title}</p>
            <p>Our support team will review your complaint and get back to you shortly. You can track the status of your complaint by logging into your account.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Complaint Tracker. This is an automated message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  statusUpdated: (name, complaintNumber, newStatus, comment) => ({
    subject: `Complaint ${complaintNumber} Status Updated - Complaint Tracker`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 40px 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
          .body { padding: 40px 32px; }
          .body p { color: #374151; line-height: 1.7; margin: 0 0 16px; }
          .status { background: #f0fdf4; color: #16a34a; font-weight: 700; padding: 10px 20px; border-radius: 8px; display: inline-block; }
          .comment-box { background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
          .footer { padding: 24px 32px; border-top: 1px solid #f3f4f6; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Status Update</h1>
          </div>
          <div class="body">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your complaint <strong>${complaintNumber}</strong> has been updated.</p>
            <p><strong>New Status:</strong><br><span class="status">${newStatus}</span></p>
            ${comment ? `<div class="comment-box"><p style="margin:0"><strong>Agent Note:</strong> ${comment}</p></div>` : ''}
            <p>Log in to your account to view the full details.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Complaint Tracker. This is an automated message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
