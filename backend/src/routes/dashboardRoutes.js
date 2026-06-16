const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/summary', authenticate, dashboardController.getSummary);
router.get('/supplier-wise', authenticate, dashboardController.getSupplierWise);
router.get('/status-wise', authenticate, dashboardController.getStatusWise);
router.get('/daily-dispatch', authenticate, dashboardController.getDailyDispatch);
router.get('/delayed', authenticate, dashboardController.getDelayed);

module.exports = router;
