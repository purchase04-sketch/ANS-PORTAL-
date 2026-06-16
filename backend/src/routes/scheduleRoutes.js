const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/temp/' });

router.post('/upload-excel', authenticate, authorize('ADMIN', 'BUYER'), upload.single('file'), scheduleController.uploadExcel);
router.get('/', authenticate, scheduleController.getSchedules);

module.exports = router;
