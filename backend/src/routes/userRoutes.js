const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// GET all users (admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, isActive: true, supplierId: true, buyerId: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET single user
router.get('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, email: true, role: true, isActive: true, supplierId: true, buyerId: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST create user
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { name, email, password, role, supplierId, buyerId } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ message: 'Email already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, role, supplierId: supplierId || null, buyerId: buyerId || null }
        });
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT update user
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { name, email, role, isActive, supplierId, buyerId, password } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (role !== undefined) data.role = role;
        if (isActive !== undefined) data.isActive = isActive;
        if (supplierId !== undefined) data.supplierId = supplierId || null;
        if (buyerId !== undefined) data.buyerId = buyerId || null;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({ where: { id: req.params.id }, data });
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE user
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
