const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const xlsx = require('xlsx');

router.get('/full-shipment-excel', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({
            include: { shipments: true }
        });

        const data = schedules.map(s => ({
            'PO No.': s.poNo,
            'Supplier': s.supplierName,
            'Item': s.itemName,
            'Schedule Qty': s.scheduleQty,
            'Dispatch Qty': s.totalDispatchQty,
            'Balance Qty': s.balanceQty,
            'Status': s.status
        }));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, "Shipments");

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename="shipments_report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating report' });
    }
});

module.exports = router;
