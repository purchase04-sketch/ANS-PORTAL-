const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// GET all suppliers
router.get('/', authenticate, authorize('ADMIN', 'BUYER'), async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({ orderBy: { supplierName: 'asc' } });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET single supplier
router.get('/:id', authenticate, authorize('ADMIN', 'BUYER'), async (req, res) => {
    try {
        const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST create supplier
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { supplierCode, supplierName, supplierEmail, contactPerson, phone, address } = req.body;
        if (!supplierCode || !supplierName || !supplierEmail) {
            return res.status(400).json({ message: 'Supplier code, name, and email are required' });
        }

        const existing = await prisma.supplier.findUnique({ where: { supplierCode } });
        if (existing) return res.status(409).json({ message: 'Supplier code already exists' });

        const supplier = await prisma.supplier.create({
            data: { supplierCode, supplierName, supplierEmail, contactPerson, phone, address }
        });
        res.status(201).json(supplier);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT update supplier
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { supplierName, supplierEmail, contactPerson, phone, address, isActive } = req.body;
        const data = {};
        if (supplierName !== undefined) data.supplierName = supplierName;
        if (supplierEmail !== undefined) data.supplierEmail = supplierEmail;
        if (contactPerson !== undefined) data.contactPerson = contactPerson;
        if (phone !== undefined) data.phone = phone;
        if (address !== undefined) data.address = address;
        if (isActive !== undefined) data.isActive = isActive;

        const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
        res.json(supplier);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Supplier not found' });
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE supplier
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        await prisma.supplier.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supplier deleted' });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Supplier not found' });
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
