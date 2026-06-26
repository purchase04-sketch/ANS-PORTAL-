const prisma = require('../utils/prisma');
const { generateSequenceNo } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLogger');
const erpService = require('../services/erpService');

// Get today's expected vehicles
exports.getTodayExpected = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const asns = await prisma.aSN.findMany({
            where: {
                status: 'SUBMITTED',
                expectedArrivalDate: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: { cndn: true, supplier: true }
        });

        res.json(asns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search ASN/Vehicle for Gate Entry
exports.searchASN = async (req, res) => {
    try {
        const { query } = req.query; // can be ASN No, Vehicle No, or Supplier Name
        if (!query) return res.status(400).json({ message: 'Search query is required' });

        const asns = await prisma.aSN.findMany({
            where: {
                OR: [
                    { asnNo: { contains: query } },
                    { cndn: { vehicleNo: { contains: query } } },
                    { supplierName: { contains: query } }
                ],
                status: { in: ['SUBMITTED', 'DELAYED_ARRIVAL'] } // Only allow submitted or delayed ones at gate
            },
            include: { cndn: true, supplier: true, gateEntry: true }
        });

        res.json(asns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Scan QR Code
exports.scanQR = async (req, res) => {
    try {
        const { qrToken } = req.body;
        if (!qrToken) return res.status(400).json({ message: 'QR Token is required' });

        const asn = await prisma.aSN.findUnique({
            where: { qrToken },
            include: {
                asnLines: { include: { scheduleLine: true } },
                cndn: true,
                documents: true,
                supplier: true,
                gateEntry: true
            }
        });

        if (!asn) return res.status(404).json({ message: 'Invalid QR Code or ASN not found' });
        
        if (['CANCELLED', 'REJECTED'].includes(asn.status)) {
            return res.status(400).json({ message: `Cannot process ASN. Status is ${asn.status}` });
        }

        res.json(asn);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark Gate In
exports.markGateIn = async (req, res) => {
    try {
        const { asnId } = req.params;
        const { gateRemarks } = req.body;

        const asn = await prisma.aSN.findUnique({
            where: { id: asnId },
            include: { gateEntry: true, asnLines: true, cndn: true, documents: true }
        });

        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        if (asn.gateEntry) return res.status(400).json({ message: 'Gate Entry already exists for this ASN' });
        if (!['SUBMITTED', 'DELAYED_ARRIVAL'].includes(asn.status)) {
             return res.status(400).json({ message: `Cannot perform Gate In. ASN Status is ${asn.status}` });
        }

        // Generate Gate Entry No
        const year = new Date().getFullYear();
        const prefix = `GE-${year}-`;
        const lastGE = await prisma.gateEntry.findFirst({
            where: { gateEntryNo: { startsWith: prefix } },
            orderBy: { gateEntryNo: 'desc' }
        });
        const lastNum = lastGE ? (parseInt(lastGE.gateEntryNo.split('-').pop()) || 0) : 0;
        const gateEntryNo = generateSequenceNo('GE', lastNum + 1);

        const gateEntry = await prisma.gateEntry.create({
            data: {
                gateEntryNo,
                asnId: asn.id,
                actualGateInDateTime: new Date(),
                securityUserId: req.user.id,
                gateStatus: 'GATE_IN',
                gateRemarks: gateRemarks || null,
                erpSyncStatus: 'PENDING'
            }
        });

        await prisma.aSN.update({
            where: { id: asn.id },
            data: { status: 'GATE_IN' }
        });

        await createAuditLog({
            userId: req.user.id, action: 'CREATE', module: 'GATE_ENTRY',
            recordId: gateEntry.id, newValue: { gateEntryNo, asnNo: asn.asnNo }, ipAddress: req.ip
        });

        // Trigger ERP Sync asynchronously
        erpService.syncGateEntryToERP(gateEntry.id).catch(err => console.error("Async ERP sync failed:", err));

        res.status(201).json({ message: 'Gate In successful', gateEntry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Hold Vehicle
exports.holdVehicle = async (req, res) => {
    try {
        const { gateEntryId } = req.params;
        const { holdReason } = req.body;

        if (!holdReason) return res.status(400).json({ message: 'Hold reason is required' });

        const gateEntry = await prisma.gateEntry.findUnique({ where: { id: gateEntryId } });
        if (!gateEntry) return res.status(404).json({ message: 'Gate entry not found' });

        const updated = await prisma.gateEntry.update({
            where: { id: gateEntryId },
            data: {
                gateStatus: 'HOLD',
                holdReason
            }
        });

        await createAuditLog({
            userId: req.user.id, action: 'UPDATE', module: 'GATE_ENTRY',
            recordId: gateEntryId, oldValue: { gateStatus: gateEntry.gateStatus }, newValue: { gateStatus: 'HOLD', holdReason }, ipAddress: req.ip
        });

        res.json({ message: 'Vehicle put on hold', gateEntry: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Release Hold
exports.releaseHold = async (req, res) => {
    try {
        const { gateEntryId } = req.params;

        const gateEntry = await prisma.gateEntry.findUnique({ where: { id: gateEntryId } });
        if (!gateEntry) return res.status(404).json({ message: 'Gate entry not found' });
        if (gateEntry.gateStatus !== 'HOLD') return res.status(400).json({ message: 'Vehicle is not on hold' });

        const updated = await prisma.gateEntry.update({
            where: { id: gateEntryId },
            data: {
                gateStatus: 'RELEASED',
                holdReason: null
            }
        });

        await createAuditLog({
            userId: req.user.id, action: 'UPDATE', module: 'GATE_ENTRY',
            recordId: gateEntryId, oldValue: { gateStatus: 'HOLD' }, newValue: { gateStatus: 'RELEASED' }, ipAddress: req.ip
        });

        res.json({ message: 'Vehicle released from hold', gateEntry: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
