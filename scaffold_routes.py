import os

routes_content = {
    "backend/src/routes/authRoutes.js": """const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
""",
    "backend/src/routes/userRoutes.js": """const express = require('express');
const router = express.Router();
// Add standard CRUD for users

module.exports = router;
""",
    "backend/src/routes/supplierRoutes.js": """const express = require('express');
const router = express.Router();

module.exports = router;
""",
    "backend/src/routes/scheduleRoutes.js": """const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/temp/' });

router.post('/upload-excel', authenticate, authorize('ADMIN', 'BUYER'), upload.single('file'), scheduleController.uploadExcel);
router.get('/', authenticate, scheduleController.getSchedules);

module.exports = router;
""",
    "backend/src/routes/shipmentRoutes.js": """const express = require('express');
const router = express.Router();

module.exports = router;
""",
    "backend/src/routes/dashboardRoutes.js": """const express = require('express');
const router = express.Router();

module.exports = router;
""",
    "backend/src/routes/reportRoutes.js": """const express = require('express');
const router = express.Router();

module.exports = router;
""",
    "backend/src/routes/emailRoutes.js": """const express = require('express');
const router = express.Router();

module.exports = router;
"""
}

controllers_content = {
    "backend/src/controllers/authController.js": """const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid credentials or inactive user' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, supplierId: user.supplierId, buyerId: user.buyerId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, supplierId: true, buyerId: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};
""",
    "backend/src/controllers/scheduleController.js": """const xlsx = require('xlsx');
const prisma = require('../utils/prisma');

exports.uploadExcel = async (req, res) => {
    // Implementation placeholder
    res.json({ message: 'Not implemented yet' });
};

exports.getSchedules = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER') {
            where.supplierId = req.user.supplierId;
        } else if (req.user.role === 'BUYER') {
            // where.buyerId = req.user.buyerId; // Or keep it open based on unit
        }
        
        const schedules = await prisma.scheduleLine.findMany({ where });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
"""
}

for path, content in {**routes_content, **controllers_content}.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Scaffolded backend routes and controllers.")
