const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/send-reminder', authenticate, authorize('BUYER', 'ADMIN'), emailController.sendReminder);

module.exports = router;
