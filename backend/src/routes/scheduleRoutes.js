const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.post('/upload-excel', authenticate, authorize('ADMIN', 'BUYER'), upload.single('file'), scheduleController.uploadExcel);
router.get('/', authenticate, scheduleController.getSchedules);
router.get('/batches', authenticate, scheduleController.getBatches);
router.get('/:id', authenticate, scheduleController.getScheduleById);

module.exports = router;
