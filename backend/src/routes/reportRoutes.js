const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/authMiddleware');
const xlsx = require('xlsx');

const generateExcel = (data, sheetName) => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const setExcelHeaders = (res, filename) => {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

const mapScheduleToReport = (s) => ({
    'Supplier Code': s.supplierCode,
    'Supplier Name': s.supplierName,
    'Buyer Name': s.buyerName,
    'Unit / Plant': s.unit,
    'PO No.': s.poNo,
    'PO Date': s.poDate ? new Date(s.poDate).toLocaleDateString() : '',
    'Item Code': s.itemCode,
    'Item Name': s.itemName,
    'Schedule Qty': s.scheduleQty,
    'Total Dispatch Qty': s.totalDispatchQty,
    'Balance Qty': s.balanceQty,
    'Required Date': new Date(s.requiredDate).toLocaleDateString(),
    'Status': s.status,
    'Remarks': s.remarks || ''
});

router.get('/full-shipment-excel', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({ orderBy: { poNo: 'asc' } });
        setExcelHeaders(res, 'full_shipment_report.xlsx');
        res.send(generateExcel(schedules.map(mapScheduleToReport), 'Full Shipment'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

router.get('/supplier-wise', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({ orderBy: { supplierName: 'asc' } });
        setExcelHeaders(res, 'supplier_wise_report.xlsx');
        res.send(generateExcel(schedules.map(mapScheduleToReport), 'Supplier Wise'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

router.get('/po-wise', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({ orderBy: { poNo: 'asc' } });
        setExcelHeaders(res, 'po_wise_report.xlsx');
        res.send(generateExcel(schedules.map(mapScheduleToReport), 'PO Wise'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

router.get('/pending', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({ where: { status: { in: ['PENDING', 'PENDING_DELAYED'] } } });
        setExcelHeaders(res, 'pending_report.xlsx');
        res.send(generateExcel(schedules.map(mapScheduleToReport), 'Pending'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

router.get('/delayed', authenticate, async (req, res) => {
    try {
        const schedules = await prisma.scheduleLine.findMany({ where: { status: { in: ['DELAYED', 'PENDING_DELAYED'] } } });
        setExcelHeaders(res, 'delayed_report.xlsx');
        res.send(generateExcel(schedules.map(mapScheduleToReport), 'Delayed'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

router.get('/today-expected', authenticate, async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const shipments = await prisma.shipment.findMany({
            where: { expectedDeliveryDate: { gte: today, lt: tomorrow } },
            include: { scheduleLine: true }
        });
        const data = shipments.map(s => ({
            ...mapScheduleToReport(s.scheduleLine),
            'Dispatch Qty': s.dispatchQty,
            'Expected Delivery': new Date(s.expectedDeliveryDate).toLocaleDateString(),
            'Invoice No.': s.invoiceNo || '',
            'LR No.': s.lrNo || '',
            'Transporter': s.transporterName || '',
            'Vehicle No.': s.vehicleNo || ''
        }));
        setExcelHeaders(res, 'today_expected_delivery.xlsx');
        res.send(generateExcel(data, 'Today Expected'));
    } catch (error) { res.status(500).json({ message: 'Error generating report' }); }
});

module.exports = router;
