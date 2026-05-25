const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getEtlRuns, runEtl, getDatasets } = require('../controllers/etlController');

// Admin only
router.use(authenticate);
router.use(authorize('Admin'));

router.get('/runs',     getEtlRuns);
router.get('/datasets', getDatasets);
router.post('/run',     runEtl);

module.exports = router;
