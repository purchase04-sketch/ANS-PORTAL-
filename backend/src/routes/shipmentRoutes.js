const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticate, shipmentController.createShipment);
router.get('/', authenticate, shipmentController.getShipments);
router.get('/:id', authenticate, shipmentController.getShipmentById);
router.delete('/:id', authenticate, shipmentController.deleteShipment);
router.post('/:id/upload-documents', authenticate, upload.single('document'), shipmentController.uploadDocuments);

module.exports = router;
