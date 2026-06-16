const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true } });
    res.json(users);
});

module.exports = router;
