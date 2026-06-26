const express = require('express');
const router = express.Router();
const erpController = require('../controllers/erpController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/config', authenticate, authorize('ADMIN'), erpController.getConfig);
router.post('/config', authenticate, authorize('ADMIN'), erpController.saveConfig);
router.post('/gate-entry/:gateEntryId/sync', authenticate, authorize('ADMIN', 'GATE'), erpController.syncGateEntry);
router.post('/gate-entry/:gateEntryId/retry', authenticate, authorize('ADMIN', 'GATE'), erpController.syncGateEntry); // same controller method
router.get('/logs', authenticate, authorize('ADMIN'), erpController.getLogs);

module.exports = router;
