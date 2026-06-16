const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/summary', authenticate, dashboardController.getSummary);

module.exports = router;
