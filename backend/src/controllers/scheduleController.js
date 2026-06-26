const xlsx = require('xlsx');
const prisma = require('../utils/prisma');
const fs = require('fs');
const { parseDate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLogger');

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let workbook;
        try {
            workbook = xlsx.readFile(req.file.path);
        } catch (parseErr) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ message: 'Cannot read Excel file. Ensure it is a valid .xls or .xlsx file.' });
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (!data || data.length === 0) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ message: 'Excel file has no data rows' });
        }

        // Validate headers
        const requiredHeaders = ['Supplier Code', 'Supplier Name', 'PO No.', 'Item Code', 'Schedule Qty', 'Required Date'];
        const headers = Object.keys(data[0]);
        // Also accept 'PO No' without dot
        const normalizedHeaders = headers.map(h => h.trim());
        const hasPONo = normalizedHeaders.includes('PO No.') || normalizedHeaders.includes('PO No');

        const missingHeaders = requiredHeaders.filter(rh => {
            if (rh === 'PO No.') return !hasPONo;
            return !normalizedHeaders.includes(rh);
        });

        if (missingHeaders.length > 0) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({
                message: `Missing required columns: ${missingHeaders.join(', ')}`,
                expectedColumns: ['Supplier Code', 'Supplier Name', 'Supplier Email', 'Buyer Name', 'Unit / Plant', 'PO No.', 'PO Date', 'Item Code', 'Item Name', 'Schedule Qty', 'Required Date', 'Remarks']
            });
        }

        let successRows = 0;
        let failedRows = 0;
        const errors = [];

        // Create upload batch record
        const uploadBatch = await prisma.uploadBatch.create({
            data: {
                fileName: req.file.originalname || req.file.filename,
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
                const supplierCode = String(row['Supplier Code'] || '').trim();
                const supplierName = String(row['Supplier Name'] || '').trim();
                const poNoRaw = row['PO No.'] || row['PO No'] || '';
                const poNo = String(poNoRaw).trim();
                const itemCode = String(row['Item Code'] || '').trim();
                const scheduleQtyRaw = row['Schedule Qty'];
                const requiredDateRaw = row['Required Date'];

                if (!supplierCode) rowErrors.push('Supplier Code is required');
                if (!supplierName) rowErrors.push('Supplier Name is required');
                if (!poNo) rowErrors.push('PO No. is required');
                if (!itemCode) rowErrors.push('Item Code is required');

                const scheduleQty = Number(scheduleQtyRaw);
                if (isNaN(scheduleQty) || scheduleQty <= 0) rowErrors.push('Schedule Qty must be a positive number');

                const requiredDate = parseDate(requiredDateRaw);
                if (!requiredDate) rowErrors.push('Required Date is required or invalid format (use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD)');

                if (rowErrors.length > 0) {
                    errors.push({ row: rowNum, errors: rowErrors });
                    failedRows++;
                    continue;
                }

                // Parse optional dates
                const poDate = parseDate(row['PO Date']);

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
                            supplierName,
                            buyerName: String(row['Buyer Name'] || ''),
                            unit: String(row['Unit / Plant'] || row['Unit'] || ''),
                            itemName: String(row['Item Name'] || ''),
                            remarks: String(row['Remarks'] || ''),
                        }
                    });
                    successRows++;
                    continue;
                }

                // Find or auto-create supplier
                let supplier = await prisma.supplier.findUnique({
                    where: { supplierCode }
                });

                if (!supplier) {
                    supplier = await prisma.supplier.create({
                        data: {
                            supplierCode,
                            supplierName,
                            supplierEmail: String(row['Supplier Email'] || `${supplierCode.toLowerCase()}@supplier.com`)
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
                        supplierCode,
                        supplierName,
                        buyerName,
                        unit: String(row['Unit / Plant'] || row['Unit'] || ''),
                        poNo,
                        poDate: poDate || null,
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
            data: {
                successRows,
                failedRows,
                uploadErrors: errors.length > 0 ? JSON.stringify(errors) : null
            }
        });

        // Clean up temp file
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        // Audit log
        await createAuditLog({
            userId: req.user.id,
            action: 'UPLOAD',
            module: 'SCHEDULE',
            recordId: uploadBatch.id,
            newValue: { total: data.length, success: successRows, failed: failedRows },
            ipAddress: req.ip
        });

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

        // Apply filters from query params (SQLite compatible — no mode: 'insensitive')
        const { status, supplierCode, poNo, itemCode } = req.query;
        if (status) where.status = status;
        if (supplierCode) where.supplierCode = supplierCode;
        if (poNo) where.poNo = { contains: poNo };
        if (itemCode) where.itemCode = { contains: itemCode };

        const schedules = await prisma.scheduleLine.findMany({
            where,
            orderBy: { requiredDate: 'asc' },
            include: { shipments: { include: { documents: true } }, asnLines: true }
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
            include: { shipments: { include: { documents: true } }, asnLines: true }
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

exports.getBatchErrors = async (req, res) => {
    try {
        const batch = await prisma.uploadBatch.findUnique({ where: { id: req.params.id } });
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        let errors = [];
        if (batch.uploadErrors) {
            try { errors = JSON.parse(batch.uploadErrors); } catch (e) {}
        }

        res.json({
            batchId: batch.id,
            fileName: batch.fileName,
            totalRows: batch.totalRows,
            successRows: batch.successRows,
            failedRows: batch.failedRows,
            uploadDate: batch.uploadDate,
            errors
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
