import os

backend_files = {
    "backend/src/app.js": """const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email', emailRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;
""",
    "backend/src/server.js": """require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
""",
    "backend/src/utils/prisma.js": """const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
""",
    "backend/src/middleware/authMiddleware.js": """const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
""",
}

backend_dirs = [
    "backend/src",
    "backend/src/controllers",
    "backend/src/routes",
    "backend/src/middleware",
    "backend/src/services",
    "backend/src/utils",
    "backend/src/validators",
    "backend/uploads"
]

for d in backend_dirs:
    os.makedirs(d, exist_ok=True)

for path, content in backend_files.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Scaffolded basic backend files.")
