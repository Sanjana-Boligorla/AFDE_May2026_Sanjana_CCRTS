const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getAllUsers, getUserById, createUser, updateUser,
  deactivateUser, getAgents, getProfile, updateProfile,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['Admin', 'Supervisor', 'Agent', 'Customer']).withMessage('Invalid role.'),
];

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate, updateProfile);
router.get('/agents', authenticate, authorize('Admin', 'Supervisor'), getAgents);
router.get('/', authenticate, authorize('Admin', 'Supervisor'), getAllUsers);
router.get('/:id', authenticate, authorize('Admin', 'Supervisor'), getUserById);
router.post('/', authenticate, authorize('Admin'), createUserRules, validate, createUser);
router.put('/:id', authenticate, authorize('Admin'), updateUser);
router.delete('/:id', authenticate, authorize('Admin'), deactivateUser);

module.exports = router;
