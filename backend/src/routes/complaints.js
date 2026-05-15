const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const upload = require('../config/multer');
const {
  getComplaints, getComplaintById, createComplaint,
  assignComplaint, updateStatus, submitFeedback,
  getStats, deleteAttachment,
} = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Stats (before /:id to avoid conflict)
router.get('/stats', authenticate, getStats);

// List
router.get('/', authenticate, getComplaints);

// Get single
router.get('/:id', authenticate, getComplaintById);

// Create (Customer + Admin)
router.post(
  '/',
  authenticate,
  authorize('Customer', 'Admin'),
  upload.array('attachments', 5),
  [
    body('category_id').isInt().withMessage('Category is required.'),
    body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 255 }),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  ],
  validate,
  createComplaint
);

// Assign (Admin / Supervisor)
router.put(
  '/:id/assign',
  authenticate,
  authorize('Admin', 'Supervisor'),
  [body('agent_id').isInt().withMessage('Agent ID required.')],
  validate,
  assignComplaint
);

// Update status (Admin / Supervisor / Agent)
router.put(
  '/:id/status',
  authenticate,
  authorize('Admin', 'Supervisor', 'Agent'),
  upload.array('attachments', 3),
  [
    body('status').notEmpty().withMessage('Status is required.'),
    body('comment').optional().isLength({ max: 1000 }),
  ],
  validate,
  updateStatus
);

// Feedback (Customer only)
router.post(
  '/:id/feedback',
  authenticate,
  authorize('Customer'),
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5.'),
    body('comments').optional().isLength({ max: 1000 }),
  ],
  validate,
  submitFeedback
);

// Delete attachment
router.delete(
  '/:id/attachments/:fileId',
  authenticate,
  authorize('Admin', 'Supervisor', 'Agent'),
  deleteAttachment
);

module.exports = router;
