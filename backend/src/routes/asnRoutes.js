const express = require('express');
const router = express.Router();
const asnController = require('../controllers/asnController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post('/draft', authenticate, authorize('SUPPLIER', 'ADMIN'), asnController.createDraft);
router.post('/submit', authenticate, authorize('SUPPLIER', 'ADMIN'), asnController.submitASN);
router.get('/', authenticate, asnController.getASNs);
router.get('/:id', authenticate, asnController.getASNById);
router.put('/:id', authenticate, authorize('SUPPLIER', 'ADMIN'), asnController.updateASN);
router.post('/:id/cancel', authenticate, authorize('SUPPLIER', 'ADMIN'), asnController.cancelASN);
router.post('/:id/upload-documents', authenticate, authorize('SUPPLIER', 'ADMIN'), upload.single('file'), asnController.uploadDocuments);
router.get('/:id/qr', authenticate, asnController.getQRCode);
router.post('/:id/cndn', authenticate, authorize('SUPPLIER', 'ADMIN'), asnController.saveCNDN);
router.get('/cndn/:id', authenticate, asnController.getCNDN);

module.exports = router;
