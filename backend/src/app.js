const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const emailRoutes = require('./routes/emailRoutes');
const asnRoutes = require('./routes/asnRoutes');
const gateRoutes = require('./routes/gateRoutes');
const erpRoutes = require('./routes/erpRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/asn', asnRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/erp', erpRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;
