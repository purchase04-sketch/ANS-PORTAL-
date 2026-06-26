const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/today-expected', authenticate, authorize('ADMIN', 'BUYER', 'GATE'), gateController.getTodayExpected);
router.get('/search', authenticate, authorize('ADMIN', 'BUYER', 'GATE'), gateController.searchASN);
router.post('/scan-qr', authenticate, authorize('ADMIN', 'GATE'), gateController.scanQR);
router.post('/:asnId/mark-gate-in', authenticate, authorize('ADMIN', 'GATE'), gateController.markGateIn);
router.post('/:gateEntryId/hold', authenticate, authorize('ADMIN', 'GATE'), gateController.holdVehicle);
router.post('/:gateEntryId/release-hold', authenticate, authorize('ADMIN', 'GATE'), gateController.releaseHold);

module.exports = router;
