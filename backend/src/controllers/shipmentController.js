const prisma = require('../utils/prisma');

const recalculateStatus = async (scheduleLineId) => {
    const line = await prisma.scheduleLine.findUnique({
        where: { id: scheduleLineId },
        include: { shipments: true }
    });
    if (!line) return;

    let totalDispatchQty = 0;
    let latestExpectedDelivery = null;
    let hasUndelivered = false;

    line.shipments.forEach(s => {
        totalDispatchQty += s.dispatchQty;
        if (s.expectedDeliveryDate) {
            const ed = new Date(s.expectedDeliveryDate);
            if (!latestExpectedDelivery || ed > latestExpectedDelivery) latestExpectedDelivery = ed;
            if (ed >= new Date()) hasUndelivered = true;
        }
    });

    let balanceQty = line.scheduleQty - totalDispatchQty;
    if (balanceQty < 0) balanceQty = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let status = 'PENDING';

    if (totalDispatchQty === 0) {
        status = new Date(line.requiredDate) < now ? 'PENDING_DELAYED' : 'PENDING';
    } else if (totalDispatchQty >= line.scheduleQty) {
        status = 'FULLY_DISPATCHED';
    } else {
        status = 'PARTIALLY_DISPATCHED';
    }

    // In transit: dispatched but expected delivery in future
    if (line.shipments.length > 0 && hasUndelivered && status !== 'FULLY_DISPATCHED') {
        status = 'IN_TRANSIT';
    }

    // Delayed: expected delivery passed but not fully dispatched
    if (latestExpectedDelivery && latestExpectedDelivery < now && status !== 'FULLY_DISPATCHED') {
        status = 'DELAYED';
    }

    await prisma.scheduleLine.update({
        where: { id: scheduleLineId },
        data: { totalDispatchQty, balanceQty, status }
    });
};

exports.createShipment = async (req, res) => {
    try {
        const {
            scheduleLineId, dispatchQty, dispatchDate, expectedDeliveryDate,
            invoiceNo, invoiceDate, lrNo, lrDate,
            transporterName, vehicleNo, numberOfBoxes, packingDetails, shipmentRemarks
        } = req.body;

        const schedule = await prisma.scheduleLine.findUnique({ where: { id: scheduleLineId } });
        if (!schedule) return res.status(404).json({ message: 'Schedule line not found' });

        const qty = Number(dispatchQty);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: 'Dispatch quantity must be positive' });
        if (qty > schedule.balanceQty) return res.status(400).json({ message: `Dispatch qty (${qty}) exceeds balance qty (${schedule.balanceQty})` });

        const shipment = await prisma.shipment.create({
            data: {
                scheduleLineId,
                dispatchQty: qty,
                dispatchDate: new Date(dispatchDate),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                invoiceNo: invoiceNo || null,
                invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                lrNo: lrNo || null,
                lrDate: lrDate ? new Date(lrDate) : null,
                transporterName: transporterName || null,
                vehicleNo: vehicleNo || null,
                numberOfBoxes: numberOfBoxes ? Number(numberOfBoxes) : null,
                packingDetails: packingDetails || null,
                shipmentRemarks: shipmentRemarks || null,
                createdBy: req.user.email
            }
        });

        await recalculateStatus(scheduleLineId);
        const updated = await prisma.scheduleLine.findUnique({ where: { id: scheduleLineId }, include: { shipments: true } });

        res.status(201).json({ shipment, scheduleLine: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getShipments = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER' && req.user.supplierId) {
            const supplier = await prisma.supplier.findUnique({ where: { id: req.user.supplierId } });
            if (supplier) {
                const lines = await prisma.scheduleLine.findMany({
                    where: { supplierCode: supplier.supplierCode },
                    select: { id: true }
                });
                where.scheduleLineId = { in: lines.map(l => l.id) };
            }
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: { scheduleLine: true, documents: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(shipments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getShipmentById = async (req, res) => {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: req.params.id },
            include: { scheduleLine: true, documents: true }
        });
        if (!shipment) return res.status(404).json({ message: 'Not found' });
        res.json(shipment);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteShipment = async (req, res) => {
    try {
        const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
        if (!shipment) return res.status(404).json({ message: 'Not found' });

        await prisma.shipment.delete({ where: { id: req.params.id } });
        await recalculateStatus(shipment.scheduleLineId);

        res.json({ message: 'Shipment deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType } = req.body;

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: 'File type not allowed. Use PDF, JPG, PNG, XLS, or XLSX.' });
        }

        const doc = await prisma.shipmentDocument.create({
            data: {
                shipmentId: id,
                documentType: documentType || 'INVOICE',
                originalFileName: req.file.originalname,
                storedFileName: req.file.filename,
                filePath: req.file.path,
                mimeType: req.file.mimetype,
                fileSize: req.file.size
            }
        });

        res.json({ message: 'Document uploaded', document: doc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
