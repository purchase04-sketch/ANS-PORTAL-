const prisma = require('../utils/prisma');

// Status calculation logic
const recalculateStatus = async (scheduleLineId) => {
    const line = await prisma.scheduleLine.findUnique({
        where: { id: scheduleLineId },
        include: { shipments: true }
    });

    if (!line) return;

    let totalDispatchQty = 0;
    let hasInTransit = false;

    line.shipments.forEach(s => {
        totalDispatchQty += s.dispatchQty;
        // Simple mock rule: if expected delivery is future and it's dispatched, it's in transit
        if (s.expectedDeliveryDate && new Date(s.expectedDeliveryDate) >= new Date()) {
            hasInTransit = true;
        }
    });

    let balanceQty = line.scheduleQty - totalDispatchQty;
    if (balanceQty < 0) balanceQty = 0;

    let status = 'PENDING';
    
    if (totalDispatchQty === 0) {
        if (new Date(line.requiredDate) < new Date()) {
            status = 'PENDING_DELAYED';
        } else {
            status = 'PENDING';
        }
    } else if (totalDispatchQty > 0 && totalDispatchQty < line.scheduleQty) {
        status = 'PARTIALLY_DISPATCHED';
    } else if (totalDispatchQty >= line.scheduleQty) {
        status = 'FULLY_DISPATCHED';
    }

    if (hasInTransit && status !== 'FULLY_DISPATCHED') {
        status = 'IN_TRANSIT';
    }

    // Check delay
    const latestExpected = line.shipments
        .filter(s => s.expectedDeliveryDate)
        .map(s => new Date(s.expectedDeliveryDate))
        .sort((a, b) => b - a)[0];

    if (latestExpected && latestExpected < new Date() && status !== 'FULLY_DISPATCHED') {
        status = 'DELAYED';
    }

    await prisma.scheduleLine.update({
        where: { id: scheduleLineId },
        data: {
            totalDispatchQty,
            balanceQty,
            status
        }
    });
};

exports.createShipment = async (req, res) => {
    try {
        const { scheduleLineId, dispatchQty, dispatchDate, expectedDeliveryDate, invoiceNo, lrNo, transporterName, vehicleNo, numberOfBoxes } = req.body;

        const schedule = await prisma.scheduleLine.findUnique({ where: { id: scheduleLineId } });
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule line not found' });
        }

        if (dispatchQty > schedule.balanceQty) {
            return res.status(400).json({ message: 'Dispatch quantity cannot exceed balance quantity' });
        }

        const shipment = await prisma.shipment.create({
            data: {
                scheduleLineId,
                dispatchQty: Number(dispatchQty),
                dispatchDate: new Date(dispatchDate),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                invoiceNo,
                lrNo,
                transporterName,
                vehicleNo,
                numberOfBoxes: Number(numberOfBoxes),
                createdBy: req.user.email
            }
        });

        await recalculateStatus(scheduleLineId);

        res.status(201).json(shipment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getShipments = async (req, res) => {
    try {
        const shipments = await prisma.shipment.findMany({
            include: { scheduleLine: true, documents: true }
        });
        res.json(shipments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadDocuments = async (req, res) => {
    try {
        const { id } = req.params; // shipmentId
        const { documentType } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
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

        res.json({ message: 'Document uploaded successfully', document: doc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
