const prisma = require('../utils/prisma');

exports.getSummary = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER' && req.user.supplierId) {
            const supplier = await prisma.supplier.findUnique({ where: { id: req.user.supplierId } });
            if (supplier) where.supplierCode = supplier.supplierCode;
        }

        const lines = await prisma.scheduleLine.findMany({ where, include: { shipments: true } });
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

        let totalLines = lines.length, totalScheduleQty = 0, totalDispatchQty = 0, totalBalanceQty = 0;
        let pending = 0, partially = 0, fully = 0, inTransit = 0, delayed = 0, pendingDelayed = 0;
        let todayExpected = 0, tomorrowExpected = 0, thisWeekDispatch = 0;

        lines.forEach(l => {
            totalScheduleQty += l.scheduleQty;
            totalDispatchQty += l.totalDispatchQty;
            totalBalanceQty += l.balanceQty;

            switch (l.status) {
                case 'PENDING': pending++; break;
                case 'PARTIALLY_DISPATCHED': partially++; break;
                case 'FULLY_DISPATCHED': fully++; break;
                case 'IN_TRANSIT': inTransit++; break;
                case 'DELAYED': delayed++; break;
                case 'PENDING_DELAYED': pendingDelayed++; break;
            }

            l.shipments.forEach(s => {
                if (s.expectedDeliveryDate) {
                    const ed = new Date(s.expectedDeliveryDate); ed.setHours(0, 0, 0, 0);
                    if (ed.getTime() === now.getTime()) todayExpected++;
                    if (ed.getTime() === tomorrow.getTime()) tomorrowExpected++;
                }
                if (s.dispatchDate) {
                    const dd = new Date(s.dispatchDate); dd.setHours(0, 0, 0, 0);
                    if (dd >= now && dd <= weekEnd) thisWeekDispatch++;
                }
            });
        });

        res.json({
            totalLines, totalScheduleQty, totalDispatchQty, totalBalanceQty,
            pending, partially, fully, inTransit, delayed, pendingDelayed,
            todayExpected, tomorrowExpected, thisWeekDispatch
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSupplierWise = async (req, res) => {
    try {
        const lines = await prisma.scheduleLine.findMany();
        const map = {};
        lines.forEach(l => {
            if (!map[l.supplierName]) map[l.supplierName] = { supplier: l.supplierName, pendingQty: 0, dispatchedQty: 0, totalLines: 0 };
            map[l.supplierName].pendingQty += l.balanceQty;
            map[l.supplierName].dispatchedQty += l.totalDispatchQty;
            map[l.supplierName].totalLines++;
        });
        res.json(Object.values(map));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.getStatusWise = async (req, res) => {
    try {
        const result = await prisma.scheduleLine.groupBy({ by: ['status'], _count: { id: true } });
        res.json(result.map(r => ({ status: r.status, count: r._count.id })));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.getDailyDispatch = async (req, res) => {
    try {
        const shipments = await prisma.shipment.findMany({
            orderBy: { dispatchDate: 'asc' },
            select: { dispatchDate: true, dispatchQty: true }
        });
        const map = {};
        shipments.forEach(s => {
            const key = new Date(s.dispatchDate).toISOString().split('T')[0];
            if (!map[key]) map[key] = { date: key, qty: 0 };
            map[key].qty += s.dispatchQty;
        });
        res.json(Object.values(map).slice(-30));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.getDelayed = async (req, res) => {
    try {
        const lines = await prisma.scheduleLine.findMany({
            where: { status: { in: ['DELAYED', 'PENDING_DELAYED'] } }
        });
        const map = {};
        lines.forEach(l => {
            if (!map[l.supplierName]) map[l.supplierName] = { supplier: l.supplierName, count: 0, balanceQty: 0 };
            map[l.supplierName].count++;
            map[l.supplierName].balanceQty += l.balanceQty;
        });
        res.json(Object.values(map));
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
