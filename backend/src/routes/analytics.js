const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMonthlySummary,
  getSLAReport,
  getCategoryAnalysis,
  getAgentPerformance,
  getResolutionTrends,
} = require('../controllers/analyticsController');

// All analytics routes require login; Admin & Supervisor only
router.use(authenticate);
router.use(authorize('Admin', 'Supervisor'));

router.get('/summary',            getMonthlySummary);
router.get('/sla',                getSLAReport);
router.get('/categories',         getCategoryAnalysis);
router.get('/agents',             getAgentPerformance);
router.get('/resolution-trends',  getResolutionTrends);

module.exports = router;
