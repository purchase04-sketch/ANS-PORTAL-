const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer configuration with diskStorage and file filter
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.xls', '.xlsx'];
    const allowedMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream' // Some browsers send this for .xls
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (allowedExtensions.includes(ext)) {
        // Accept if extension is correct even if mimetype is unexpected
        cb(null, true);
    } else {
        cb(new Error('Only .xls and .xlsx files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds 10MB limit' });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

router.post('/upload-excel', authenticate, authorize('ADMIN', 'BUYER'), handleUpload, scheduleController.uploadExcel);
router.get('/', authenticate, scheduleController.getSchedules);
router.get('/batches', authenticate, scheduleController.getBatches);
router.get('/batches/:id/errors', authenticate, scheduleController.getBatchErrors);
router.get('/:id', authenticate, scheduleController.getScheduleById);

module.exports = router;
