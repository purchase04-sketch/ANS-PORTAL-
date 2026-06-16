const prisma = require('../utils/prisma');

exports.getSummary = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER') {
            const supplier = await prisma.supplier.findUnique({ where: { id: req.user.supplierId } });
            if (supplier) {
                 where.supplierCode = supplier.supplierCode;
            }
        }

        const lines = await prisma.scheduleLine.findMany({ where });

        let totalLines = lines.length;
        let totalScheduleQty = 0;
        let totalDispatchQty = 0;
        let totalBalanceQty = 0;

        let pending = 0;
        let partially = 0;
        let fully = 0;
        let inTransit = 0;
        let delayed = 0;
        let pendingDelayed = 0;

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
        });

        res.json({
            totalLines,
            totalScheduleQty,
            totalDispatchQty,
            totalBalanceQty,
            pending,
            partially,
            fully,
            inTransit,
            delayed,
            pendingDelayed
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
