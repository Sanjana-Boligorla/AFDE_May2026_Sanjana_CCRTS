const express = require('express');
const router  = express.Router();
const { getStats, getSLABreaches } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats',       authenticate, getStats);
router.get('/sla-breaches', authenticate, authorize('Admin','Supervisor'), getSLABreaches);

module.exports = router;
