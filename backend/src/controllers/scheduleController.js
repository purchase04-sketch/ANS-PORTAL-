const xlsx = require('xlsx');
const prisma = require('../utils/prisma');
const fs = require('fs');

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            // Clean up temp file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Empty Excel file' });
        }

        let successRows = 0;
        let failedRows = 0;
        const errors = [];

        // Create upload batch record
        const uploadBatch = await prisma.uploadBatch.create({
            data: {
                fileName: req.file.originalname,
                uploadedBy: req.user.email,
                totalRows: data.length
            }
        });

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2; // +2 because row 1 is header, data starts at 2
            try {
                // Validation
                const rowErrors = [];
                if (!row['Supplier Code']) rowErrors.push('Supplier Code is required');
                if (!row['Supplier Name']) rowErrors.push('Supplier Name is required');
                if (!row['PO No.'] && !row['PO No']) rowErrors.push('PO No. is required');
                if (!row['Item Code']) rowErrors.push('Item Code is required');

                const scheduleQty = Number(row['Schedule Qty']);
                if (isNaN(scheduleQty) || scheduleQty <= 0) rowErrors.push('Schedule Qty must be a positive number');

                const requiredDateRaw = row['Required Date'];
                let requiredDate;
                if (requiredDateRaw) {
                    requiredDate = new Date(requiredDateRaw);
                    if (isNaN(requiredDate.getTime())) rowErrors.push('Required Date is invalid');
                } else {
                    rowErrors.push('Required Date is required');
                }

                if (rowErrors.length > 0) {
                    errors.push({ row: rowNum, errors: rowErrors });
                    failedRows++;
                    continue;
                }

                const poNo = String(row['PO No.'] || row['PO No']);
                const itemCode = String(row['Item Code']);

                // Check duplicates within the database
                const existing = await prisma.scheduleLine.findFirst({
                    where: {
                        poNo,
                        itemCode,
                        requiredDate: { equals: requiredDate }
                    }
                });

                if (existing) {
                    // Update existing record
                    await prisma.scheduleLine.update({
                        where: { id: existing.id },
                        data: {
                            scheduleQty,
                            balanceQty: scheduleQty - existing.totalDispatchQty,
                            supplierName: String(row['Supplier Name']),
                            buyerName: String(row['Buyer Name'] || ''),
                            unit: String(row['Unit / Plant'] || row['Unit'] || ''),
                            itemName: String(row['Item Name'] || ''),
                            remarks: String(row['Remarks'] || ''),
                        }
                    });
                    successRows++;
                    continue;
                }

                // Find supplier mapping
                let supplier = await prisma.supplier.findUnique({
                    where: { supplierCode: String(row['Supplier Code']) }
                });

                // Auto-create supplier if not found
                if (!supplier) {
                    supplier = await prisma.supplier.create({
                        data: {
                            supplierCode: String(row['Supplier Code']),
                            supplierName: String(row['Supplier Name']),
                            supplierEmail: String(row['Supplier Email'] || `${String(row['Supplier Code']).toLowerCase()}@supplier.com`)
                        }
                    });
                }

                // Find buyer
                let buyer = null;
                const buyerName = String(row['Buyer Name'] || '');
                if (buyerName) {
                    buyer = await prisma.buyer.findFirst({ where: { buyerName } });
                }

                await prisma.scheduleLine.create({
                    data: {
                        supplierId: supplier.id,
                        buyerId: buyer ? buyer.id : null,
                        supplierCode: String(row['Supplier Code']),
                        supplierName: String(row['Supplier Name']),
                        buyerName,
                        unit: String(row['Unit / Plant'] || row['Unit'] || ''),
                        poNo,
                        poDate: row['PO Date'] ? new Date(row['PO Date']) : new Date(),
                        itemCode,
                        itemName: String(row['Item Name'] || ''),
                        scheduleQty,
                        balanceQty: scheduleQty,
                        requiredDate,
                        remarks: String(row['Remarks'] || ''),
                        uploadBatchId: uploadBatch.id,
                        status: 'PENDING'
                    }
                });
                successRows++;
            } catch (err) {
                console.error('Row insert error:', err.message);
                errors.push({ row: rowNum, errors: [err.message] });
                failedRows++;
            }
        }

        await prisma.uploadBatch.update({
            where: { id: uploadBatch.id },
            data: { successRows, failedRows }
        });

        // Clean up temp file
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        res.json({
            message: 'Upload complete',
            total: data.length,
            success: successRows,
            failed: failedRows,
            batchId: uploadBatch.id,
            errors
        });
    } catch (error) {
        console.error('Excel upload error:', error);
        res.status(500).json({ message: 'Server error processing Excel file', error: error.message });
    }
};

exports.getSchedules = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER') {
            if (req.user.supplierId) {
                const supplier = await prisma.supplier.findUnique({ where: { id: req.user.supplierId } });
                if (supplier) where.supplierCode = supplier.supplierCode;
            }
        }

        // Apply filters from query params
        const { status, supplierCode, poNo, itemCode, search } = req.query;
        if (status) where.status = status;
        if (supplierCode) where.supplierCode = supplierCode;
        if (poNo) where.poNo = { contains: poNo, mode: 'insensitive' };
        if (itemCode) where.itemCode = { contains: itemCode, mode: 'insensitive' };

        const schedules = await prisma.scheduleLine.findMany({
            where,
            orderBy: { requiredDate: 'asc' },
            include: { shipments: { include: { documents: true } } }
        });
        res.json(schedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getScheduleById = async (req, res) => {
    try {
        const schedule = await prisma.scheduleLine.findUnique({
            where: { id: req.params.id },
            include: { shipments: { include: { documents: true } } }
        });
        if (!schedule) return res.status(404).json({ message: 'Not found' });
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBatches = async (req, res) => {
    try {
        const batches = await prisma.uploadBatch.findMany({ orderBy: { uploadDate: 'desc' } });
        res.json(batches);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
