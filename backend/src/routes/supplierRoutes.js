const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('ADMIN', 'BUYER'), async (req, res) => {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
});

module.exports = router;
