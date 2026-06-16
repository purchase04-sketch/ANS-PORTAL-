const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/send-reminder', authenticate, authorize('BUYER', 'ADMIN'), emailController.sendReminder);

// GET email logs
router.get('/logs', authenticate, authorize('ADMIN', 'BUYER'), async (req, res) => {
    try {
        const logs = await prisma.emailLog.findMany({
            orderBy: { sentAt: 'desc' },
            take: 100,
            include: {
                supplier: { select: { supplierName: true, supplierCode: true } },
                scheduleLine: { select: { poNo: true, itemCode: true, itemName: true } }
            }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
