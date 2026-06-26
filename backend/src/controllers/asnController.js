const prisma = require('../utils/prisma');
const { generateSecureToken, generateSequenceNo, parseDate } = require('../utils/helpers');
const { generateQRCode, generateQRCodeDataURL } = require('../utils/qrGenerator');
const { createAuditLog } = require('../utils/auditLogger');

// Get next ASN sequence number
async function getNextASNNo() {
    const year = new Date().getFullYear();
    const prefix = `ASN-${year}-`;
    const lastASN = await prisma.aSN.findFirst({
        where: { asnNo: { startsWith: prefix } },
        orderBy: { asnNo: 'desc' }
    });
    if (lastASN) {
        const lastNum = parseInt(lastASN.asnNo.split('-').pop()) || 0;
        return generateSequenceNo('ASN', lastNum + 1);
    }
    return generateSequenceNo('ASN', 1);
}

// Create ASN as Draft
exports.createDraft = async (req, res) => {
    try {
        const {
            supplierCode, buyerName, unit, expectedArrivalDate, expectedArrivalTime,
            remarks, lines
        } = req.body;

        if (!supplierCode || !lines || lines.length === 0) {
            return res.status(400).json({ message: 'Supplier code and at least one PO line are required' });
        }

        // Validate supplier
        const supplier = await prisma.supplier.findUnique({ where: { supplierCode } });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Validate lines
        const lineErrors = [];
        let totalAsnQty = 0;
        const validatedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            if (!line.scheduleLineId) {
                lineErrors.push({ line: lineNum, error: 'Schedule Line ID is required' });
                continue;
            }

            const scheduleLine = await prisma.scheduleLine.findUnique({ where: { id: line.scheduleLineId } });
            if (!scheduleLine) {
                lineErrors.push({ line: lineNum, error: 'Schedule Line not found' });
                continue;
            }

            const asnQty = Number(line.asnQty);
            if (isNaN(asnQty) || asnQty <= 0) {
                lineErrors.push({ line: lineNum, error: 'ASN Qty must be positive' });
                continue;
            }

            // Calculate current total ASN qty for this schedule line
            const existingASNQty = await prisma.aSNLine.aggregate({
                where: {
                    scheduleLineId: line.scheduleLineId,
                    asn: { status: { notIn: ['CANCELLED', 'REJECTED'] } }
                },
                _sum: { asnQty: true }
            });
            const usedQty = existingASNQty._sum.asnQty || 0;
            const availableQty = scheduleLine.scheduleQty - usedQty;

            if (asnQty > availableQty) {
                lineErrors.push({ line: lineNum, error: `ASN Qty (${asnQty}) exceeds available balance (${availableQty})` });
                continue;
            }

            totalAsnQty += asnQty;
            validatedLines.push({
                scheduleLineId: line.scheduleLineId,
                poNo: scheduleLine.poNo,
                poDate: scheduleLine.poDate,
                itemCode: scheduleLine.itemCode,
                itemName: scheduleLine.itemName,
                scheduleQty: scheduleLine.scheduleQty,
                asnQty,
                balanceQty: availableQty - asnQty,
                invoiceNo: line.invoiceNo || null,
                invoiceDate: line.invoiceDate ? parseDate(line.invoiceDate) : null,
                ewayBillNo: line.ewayBillNo || null,
                shipmentType: asnQty >= availableQty ? 'FULL' : 'PARTIAL',
                remarks: line.remarks || null
            });
        }

        if (lineErrors.length > 0) {
            return res.status(400).json({ message: 'Validation errors in ASN lines', errors: lineErrors });
        }

        const asnNo = await getNextASNNo();

        const asn = await prisma.aSN.create({
            data: {
                asnNo,
                supplierId: supplier.id,
                supplierCode,
                supplierName: supplier.supplierName,
                buyerName: buyerName || null,
                unit: unit || null,
                status: 'DRAFT',
                expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : null,
                expectedArrivalTime: expectedArrivalTime || null,
                totalAsnQty,
                remarks: remarks || null,
                createdBy: req.user.email,
                asnLines: {
                    create: validatedLines
                }
            },
            include: { asnLines: true }
        });

        await createAuditLog({
            userId: req.user.id, action: 'CREATE', module: 'ASN',
            recordId: asn.id, newValue: { asnNo, status: 'DRAFT' }, ipAddress: req.ip
        });

        res.status(201).json({ message: 'ASN draft created', asn });
    } catch (error) {
        console.error('Create ASN error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Submit ASN (generates QR)
exports.submitASN = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: 'ASN ID is required' });

        const asn = await prisma.aSN.findUnique({
            where: { id },
            include: { asnLines: true, cndn: true }
        });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        if (asn.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft ASN can be submitted' });

        // Generate secure QR token
        const qrToken = generateSecureToken();

        // QR payload — secure reference only
        const qrPayload = {
            token: qrToken,
            asnNo: asn.asnNo,
            supplierCode: asn.supplierCode,
            vehicleNo: asn.cndn?.vehicleNo || '',
            poNos: [...new Set(asn.asnLines.map(l => l.poNo))].join(','),
            expectedDate: asn.expectedArrivalDate?.toISOString()?.split('T')[0] || ''
        };

        // Generate QR code file
        const qrCodePath = await generateQRCode(qrPayload, `qr-${asn.asnNo}`);

        // Update ASN
        const updated = await prisma.aSN.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                qrToken,
                qrCodePath
            },
            include: { asnLines: true, cndn: true, documents: true }
        });

        await createAuditLog({
            userId: req.user.id, action: 'UPDATE', module: 'ASN',
            recordId: id, oldValue: { status: 'DRAFT' }, newValue: { status: 'SUBMITTED' }, ipAddress: req.ip
        });

        res.json({ message: 'ASN submitted and QR gate pass generated', asn: updated });
    } catch (error) {
        console.error('Submit ASN error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all ASNs
exports.getASNs = async (req, res) => {
    try {
        let where = {};

        if (req.user.role === 'SUPPLIER' && req.user.supplierId) {
            where.supplierId = req.user.supplierId;
        }

        const { status, supplierCode, asnNo } = req.query;
        if (status) where.status = status;
        if (supplierCode) where.supplierCode = supplierCode;
        if (asnNo) where.asnNo = { contains: asnNo };

        const asns = await prisma.aSN.findMany({
            where,
            include: {
                asnLines: true,
                cndn: true,
                gateEntry: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Check for delayed arrivals
        const now = new Date();
        for (const asn of asns) {
            if (
                asn.status === 'SUBMITTED' &&
                asn.expectedArrivalDate &&
                new Date(asn.expectedArrivalDate) < now &&
                !asn.gateEntry
            ) {
                await prisma.aSN.update({
                    where: { id: asn.id },
                    data: { status: 'DELAYED_ARRIVAL' }
                });
                asn.status = 'DELAYED_ARRIVAL';
            }
        }

        res.json(asns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single ASN
exports.getASNById = async (req, res) => {
    try {
        const asn = await prisma.aSN.findUnique({
            where: { id: req.params.id },
            include: {
                asnLines: { include: { scheduleLine: true } },
                cndn: true,
                documents: true,
                gateEntry: true,
                supplier: true
            }
        });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        res.json(asn);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Update ASN (only draft)
exports.updateASN = async (req, res) => {
    try {
        const { id } = req.params;
        const asn = await prisma.aSN.findUnique({ where: { id } });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        if (asn.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft ASN can be updated' });

        const { expectedArrivalDate, expectedArrivalTime, remarks, buyerName, unit } = req.body;

        const updated = await prisma.aSN.update({
            where: { id },
            data: {
                expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : asn.expectedArrivalDate,
                expectedArrivalTime: expectedArrivalTime || asn.expectedArrivalTime,
                remarks: remarks !== undefined ? remarks : asn.remarks,
                buyerName: buyerName !== undefined ? buyerName : asn.buyerName,
                unit: unit !== undefined ? unit : asn.unit
            },
            include: { asnLines: true, cndn: true }
        });

        res.json({ message: 'ASN updated', asn: updated });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Cancel ASN
exports.cancelASN = async (req, res) => {
    try {
        const { id } = req.params;
        const asn = await prisma.aSN.findUnique({ where: { id } });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        if (['GATE_IN', 'ERP_SUCCESS', 'COMPLETED'].includes(asn.status)) {
            return res.status(400).json({ message: 'Cannot cancel ASN after gate entry' });
        }

        const updated = await prisma.aSN.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        await createAuditLog({
            userId: req.user.id, action: 'UPDATE', module: 'ASN',
            recordId: id, oldValue: { status: asn.status }, newValue: { status: 'CANCELLED' }, ipAddress: req.ip
        });

        res.json({ message: 'ASN cancelled', asn: updated });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Upload documents for ASN
exports.uploadDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType } = req.body;

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const asn = await prisma.aSN.findUnique({ where: { id } });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });

        const doc = await prisma.aSNDocument.create({
            data: {
                asnId: id,
                documentType: documentType || 'INVOICE',
                originalFileName: req.file.originalname || req.file.filename,
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

// Get QR code for ASN
exports.getQRCode = async (req, res) => {
    try {
        const asn = await prisma.aSN.findUnique({
            where: { id: req.params.id },
            include: { cndn: true, asnLines: true }
        });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });
        if (!asn.qrToken) return res.status(400).json({ message: 'QR code not generated. Submit the ASN first.' });

        const qrPayload = {
            token: asn.qrToken,
            asnNo: asn.asnNo,
            supplierCode: asn.supplierCode,
            vehicleNo: asn.cndn?.vehicleNo || '',
            poNos: [...new Set(asn.asnLines.map(l => l.poNo))].join(','),
            expectedDate: asn.expectedArrivalDate?.toISOString()?.split('T')[0] || ''
        };

        const dataUrl = await generateQRCodeDataURL(qrPayload);

        res.json({
            asnNo: asn.asnNo,
            qrDataUrl: dataUrl,
            qrToken: asn.qrToken,
            supplierCode: asn.supplierCode,
            vehicleNo: asn.cndn?.vehicleNo || '',
            expectedArrivalDate: asn.expectedArrivalDate,
            expectedArrivalTime: asn.expectedArrivalTime
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Save CN/DN for ASN
exports.saveCNDN = async (req, res) => {
    try {
        const { id } = req.params;
        const asn = await prisma.aSN.findUnique({ where: { id } });
        if (!asn) return res.status(404).json({ message: 'ASN not found' });

        const {
            dnNo, dnDate, cnNo, cnDate, lrNo, lrDate,
            transporterName, vehicleNo, vehicleType, driverName, driverMobile,
            noOfBoxes, grossWeight, netWeight, packingDetails,
            freightMode, dispatchLocation, deliveryLocation
        } = req.body;

        // Check for duplicate DN/CN for same supplier
        if (dnNo) {
            const existingDN = await prisma.cNDN.findFirst({
                where: { dnNo, asn: { supplierCode: asn.supplierCode, id: { not: id } } }
            });
            if (existingDN) return res.status(400).json({ message: `DN No. ${dnNo} already used for this supplier` });
        }
        if (cnNo) {
            const existingCN = await prisma.cNDN.findFirst({
                where: { cnNo, asn: { supplierCode: asn.supplierCode, id: { not: id } } }
            });
            if (existingCN) return res.status(400).json({ message: `CN No. ${cnNo} already used for this supplier` });
        }

        const existing = await prisma.cNDN.findUnique({ where: { asnId: id } });

        let cndn;
        if (existing) {
            cndn = await prisma.cNDN.update({
                where: { asnId: id },
                data: {
                    dnNo, dnDate: dnDate ? new Date(dnDate) : null,
                    cnNo, cnDate: cnDate ? new Date(cnDate) : null,
                    lrNo, lrDate: lrDate ? new Date(lrDate) : null,
                    transporterName, vehicleNo, vehicleType, driverName, driverMobile,
                    noOfBoxes: noOfBoxes ? Number(noOfBoxes) : null,
                    grossWeight: grossWeight ? Number(grossWeight) : null,
                    netWeight: netWeight ? Number(netWeight) : null,
                    packingDetails, freightMode, dispatchLocation, deliveryLocation
                }
            });
        } else {
            cndn = await prisma.cNDN.create({
                data: {
                    asnId: id,
                    dnNo, dnDate: dnDate ? new Date(dnDate) : null,
                    cnNo, cnDate: cnDate ? new Date(cnDate) : null,
                    lrNo, lrDate: lrDate ? new Date(lrDate) : null,
                    transporterName, vehicleNo, vehicleType, driverName, driverMobile,
                    noOfBoxes: noOfBoxes ? Number(noOfBoxes) : null,
                    grossWeight: grossWeight ? Number(grossWeight) : null,
                    netWeight: netWeight ? Number(netWeight) : null,
                    packingDetails, freightMode, dispatchLocation, deliveryLocation
                }
            });
        }

        res.json({ message: 'CN/DN saved', cndn });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get CN/DN
exports.getCNDN = async (req, res) => {
    try {
        const cndn = await prisma.cNDN.findUnique({
            where: { id: req.params.id },
            include: { asn: true }
        });
        if (!cndn) return res.status(404).json({ message: 'CN/DN not found' });
        res.json(cndn);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
