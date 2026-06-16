const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for specific files (PDF, JPG, PNG, XLS) with 10MB limit
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/', authenticate, authorize('SUPPLIER'), shipmentController.createShipment);
router.get('/', authenticate, shipmentController.getShipments);
router.post('/:id/upload-documents', authenticate, authorize('SUPPLIER'), upload.single('document'), shipmentController.uploadDocuments);

module.exports = router;
