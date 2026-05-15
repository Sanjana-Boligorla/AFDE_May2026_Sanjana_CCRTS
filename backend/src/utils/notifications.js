const { pool } = require('../config/db');
const { sendEmail, emailTemplates } = require('./email');

const createNotification = async ({ userId, title, message, type, relatedType, relatedId }) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message, type, relatedType || null, relatedId || null]
    );
  } catch (err) {
    console.error('Notification insert failed:', err.message);
  }
};

const notifyComplaintCreated = async (complaint, customer) => {
  // Notify customer
  await createNotification({
    userId: customer.id,
    title: `Complaint ${complaint.complaint_number} Registered`,
    message: `Your complaint "${complaint.title}" has been received and is being reviewed.`,
    type: 'complaint_created',
    relatedType: 'complaint',
    relatedId: complaint.id,
  });

  // Email customer
  const { subject, html } = emailTemplates.complaintCreated(
    customer.name, complaint.complaint_number, complaint.title
  );
  await sendEmail({ to: customer.email, subject, html });

  // Notify all admins & supervisors
  const [admins] = await pool.query(
    `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
     WHERE r.name IN ('Admin','Supervisor') AND u.is_active = TRUE`
  );
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: `New Complaint: ${complaint.complaint_number}`,
      message: `"${complaint.title}" submitted by ${customer.name}`,
      type: 'complaint_created',
      relatedType: 'complaint',
      relatedId: complaint.id,
    });
  }
};

const notifyStatusUpdated = async (complaint, updatedBy, newStatus, comment, customer) => {
  await createNotification({
    userId: customer.id,
    title: `Complaint ${complaint.complaint_number} Updated`,
    message: `Status changed to "${newStatus}"${comment ? ': ' + comment : ''}`,
    type: 'status_updated',
    relatedType: 'complaint',
    relatedId: complaint.id,
  });

  const { subject, html } = emailTemplates.statusUpdated(
    customer.name, complaint.complaint_number, newStatus, comment
  );
  await sendEmail({ to: customer.email, subject, html });
};

const notifyAssigned = async (complaint, agentId) => {
  await createNotification({
    userId: agentId,
    title: `Complaint Assigned: ${complaint.complaint_number}`,
    message: `You have been assigned complaint "${complaint.title}"`,
    type: 'complaint_assigned',
    relatedType: 'complaint',
    relatedId: complaint.id,
  });
};

module.exports = { createNotification, notifyComplaintCreated, notifyStatusUpdated, notifyAssigned };
