const path = require('path');
const fs   = require('fs');
const { pool } = require('../config/db');
const { notifyComplaintCreated, notifyStatusUpdated, notifyAssigned } = require('../utils/notifications');

// Generate complaint number: CMP-2026-0001
const generateComplaintNumber = async () => {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM complaints WHERE YEAR(created_at) = ?`, [year]
  );
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `CMP-${year}-${seq}`;
};

// ─── GET /api/complaints ────────────────────────────────────────────────────
const getComplaints = async (req, res, next) => {
  try {
    const { status, priority, category, search, assigned_to, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { role, id: userId } = req.user;

    let where = ['1=1'];
    const params = [];

    // Customers only see their own
    if (role === 'Customer') { where.push('c.customer_id = ?'); params.push(userId); }
    // Agents only see assigned
    else if (role === 'Agent') { where.push('c.assigned_to = ?'); params.push(userId); }

    if (status)      { where.push('c.status = ?');           params.push(status); }
    if (priority)    { where.push('c.priority = ?');         params.push(priority); }
    if (category)    { where.push('c.category_id = ?');      params.push(category); }
    if (assigned_to) { where.push('c.assigned_to = ?');      params.push(assigned_to); }
    if (search)      {
      where.push('(c.complaint_number LIKE ? OR c.title LIKE ? OR c.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereStr = where.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM complaints c WHERE ${whereStr}`, params
    );

    const [complaints] = await pool.query(
      `SELECT c.id, c.complaint_number, c.title, c.priority, c.status, c.sla_breach,
              c.created_at, c.updated_at, c.resolved_at,
              cat.name AS category,
              cu.name AS customer_name, cu.email AS customer_email,
              ag.name AS agent_name
       FROM complaints c
       JOIN categories cat ON c.category_id = cat.id
       JOIN users cu ON c.customer_id = cu.id
       LEFT JOIN users ag ON c.assigned_to = ag.id
       WHERE ${whereStr}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          total: countRows[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countRows[0].total / limit),
        },
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/complaints/:id ────────────────────────────────────────────────
const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const [rows] = await pool.query(
      `SELECT c.*, cat.name AS category,
              cu.id AS customer_id, cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
              ag.name AS agent_name, ag.email AS agent_email
       FROM complaints c
       JOIN categories cat ON c.category_id = cat.id
       JOIN users cu ON c.customer_id = cu.id
       LEFT JOIN users ag ON c.assigned_to = ag.id
       WHERE c.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const complaint = rows[0];

    // Access control
    if (role === 'Customer' && complaint.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (role === 'Agent' && complaint.assigned_to !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // History
    const [history] = await pool.query(
      `SELECT ch.*, u.name AS updated_by_name
       FROM complaint_history ch
       JOIN users u ON ch.updated_by = u.id
       WHERE ch.complaint_id = ?
       ORDER BY ch.created_at ASC`,
      [id]
    );

    // Attachments
    const [attachments] = await pool.query(
      'SELECT * FROM attachments WHERE complaint_id = ? ORDER BY created_at ASC', [id]
    );

    // Feedback
    const [feedback] = await pool.query(
      'SELECT * FROM feedback WHERE complaint_id = ?', [id]
    );

    res.json({
      success: true,
      data: { complaint, history, attachments, feedback: feedback[0] || null },
    });
  } catch (err) { next(err); }
};

// ─── POST /api/complaints ───────────────────────────────────────────────────
const createComplaint = async (req, res, next) => {
  try {
    const { category_id, title, description, priority } = req.body;
    const customerId = req.user.id;

    const complaintNumber = await generateComplaintNumber();

    // Calculate SLA due date
    const [slaRows] = await pool.query(
      'SELECT resolution_time_hours FROM sla_rules WHERE priority = ?',
      [priority || 'Medium']
    );
    const slaHours = slaRows[0]?.resolution_time_hours || 48;
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000);

    const [result] = await pool.query(
      `INSERT INTO complaints
         (complaint_number, customer_id, category_id, title, description, priority, sla_due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [complaintNumber, customerId, category_id, title, description, priority || 'Medium', slaDueAt]
    );

    const complaintId = result.insertId;

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO attachments (complaint_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [complaintId, file.filename, file.originalname, file.path, file.size, file.mimetype, customerId]
        );
      }
    }

    // History entry
    await pool.query(
      `INSERT INTO complaint_history (complaint_id, updated_by, old_status, new_status, comment)
       VALUES (?, ?, NULL, 'Open', 'Complaint submitted by customer')`,
      [complaintId, customerId]
    );

    // Notifications (non-blocking)
    const [customerRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [customerId]);
    const complaint = { id: complaintId, complaint_number: complaintNumber, title };
    notifyComplaintCreated(complaint, customerRows[0]).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully.',
      data: { complaintId, complaintNumber },
    });
  } catch (err) { next(err); }
};

// ─── PUT /api/complaints/:id/assign ────────────────────────────────────────
const assignComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;

    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const complaint = rows[0];
    const oldStatus = complaint.status;
    const newStatus = 'Assigned';

    await pool.query(
      'UPDATE complaints SET assigned_to = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [agent_id, newStatus, id]
    );

    await pool.query(
      `INSERT INTO complaint_history (complaint_id, updated_by, old_status, new_status, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, oldStatus, newStatus, `Assigned to agent ID ${agent_id}`]
    );

    notifyAssigned(complaint, agent_id).catch(console.error);

    res.json({ success: true, message: 'Complaint assigned successfully.' });
  } catch (err) { next(err); }
};

// ─── PUT /api/complaints/:id/status ────────────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const { role, id: userId } = req.user;

    const VALID = ['Open','Assigned','In Progress','Pending Customer Response','Escalated','Resolved','Closed'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const [rows] = await pool.query(
      `SELECT c.*, cu.name AS customer_name, cu.email AS customer_email, cu.id AS cust_id
       FROM complaints c JOIN users cu ON c.customer_id = cu.id WHERE c.id = ?`, [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const complaint = rows[0];

    // Agents can only update their assigned complaints
    if (role === 'Agent' && complaint.assigned_to !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const now = new Date();
    let extra = {};
    if (status === 'Resolved') extra = { resolved_at: now };
    if (status === 'Closed')   extra = { closed_at: now };

    await pool.query(
      `UPDATE complaints SET status = ?, resolved_at = COALESCE(?, resolved_at),
       closed_at = COALESCE(?, closed_at), updated_at = NOW() WHERE id = ?`,
      [status, extra.resolved_at || null, extra.closed_at || null, id]
    );

    await pool.query(
      `INSERT INTO complaint_history (complaint_id, updated_by, old_status, new_status, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, complaint.status, status, comment || null]
    );

    // Handle attachments for resolution
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO attachments (complaint_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, file.filename, file.originalname, file.path, file.size, file.mimetype, userId]
        );
      }
    }

    const customer = { id: complaint.cust_id, name: complaint.customer_name, email: complaint.customer_email };
    notifyStatusUpdated(complaint, userId, status, comment, customer).catch(console.error);

    res.json({ success: true, message: 'Status updated successfully.' });
  } catch (err) { next(err); }
};

// ─── POST /api/complaints/:id/feedback ─────────────────────────────────────
const submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comments } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM complaints WHERE id = ? AND customer_id = ?', [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    if (!['Resolved','Closed'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Feedback only allowed on resolved complaints.' });
    }

    const [existing] = await pool.query('SELECT id FROM feedback WHERE complaint_id = ?', [id]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Feedback already submitted.' });

    await pool.query(
      'INSERT INTO feedback (complaint_id, customer_id, rating, comments) VALUES (?, ?, ?, ?)',
      [id, req.user.id, rating, comments || null]
    );

    // Close complaint after feedback
    await pool.query(
      "UPDATE complaints SET status = 'Closed', closed_at = NOW() WHERE id = ?", [id]
    );
    await pool.query(
      `INSERT INTO complaint_history (complaint_id, updated_by, old_status, new_status, comment)
       VALUES (?, ?, 'Resolved', 'Closed', 'Customer submitted feedback and closed the complaint')`,
      [id, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Feedback submitted. Complaint closed.' });
  } catch (err) { next(err); }
};

// ─── GET /api/complaints/stats ──────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    let whereClause = '';
    const params = [];

    if (role === 'Customer') { whereClause = 'WHERE customer_id = ?'; params.push(userId); }
    else if (role === 'Agent') { whereClause = 'WHERE assigned_to = ?'; params.push(userId); }

    const [totals] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'Open') AS open,
         SUM(status = 'Assigned') AS assigned,
         SUM(status = 'In Progress') AS in_progress,
         SUM(status = 'Escalated') AS escalated,
         SUM(status = 'Resolved') AS resolved,
         SUM(status = 'Closed') AS closed,
         SUM(sla_breach = 1) AS sla_breaches,
         SUM(status = 'Pending Customer Response') AS pending
       FROM complaints ${whereClause}`,
      params
    );

    const [recentComplaints] = await pool.query(
      `SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
              u.name AS customer_name, cat.name AS category
       FROM complaints c
       JOIN users u ON c.customer_id = u.id
       JOIN categories cat ON c.category_id = cat.id
       ${whereClause}
       ORDER BY c.created_at DESC LIMIT 5`,
      params
    );

    res.json({ success: true, data: { stats: totals[0], recentComplaints } });
  } catch (err) { next(err); }
};

// ─── GET /api/complaints/:id/attachments/:fileId ────────────────────────────
const deleteAttachment = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;
    const [rows] = await pool.query('SELECT * FROM attachments WHERE id = ? AND complaint_id = ?', [fileId, id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Attachment not found.' });

    // Delete file from disk
    if (fs.existsSync(rows[0].file_path)) fs.unlinkSync(rows[0].file_path);
    await pool.query('DELETE FROM attachments WHERE id = ?', [fileId]);

    res.json({ success: true, message: 'Attachment deleted.' });
  } catch (err) { next(err); }
};

module.exports = {
  getComplaints, getComplaintById, createComplaint,
  assignComplaint, updateStatus, submitFeedback,
  getStats, deleteAttachment,
};
