const xlsx = require('xlsx');
const prisma = require('../utils/prisma');

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
            return res.status(400).json({ message: 'Empty Excel file' });
        }

        let successRows = 0;
        let failedRows = 0;
        const batchId = `BATCH-${Date.now()}`;

        // Create upload batch record
        const uploadBatch = await prisma.uploadBatch.create({
            data: {
                fileName: req.file.originalname,
                uploadedBy: req.user.email,
                totalRows: data.length
            }
        });

        for (const row of data) {
            try {
                // Validation
                if (!row['Supplier Code'] || !row['Supplier Name'] || !row['PO No.'] || !row['Item Code']) {
                    failedRows++;
                    continue;
                }

                const poNo = String(row['PO No.']);
                const itemCode = String(row['Item Code']);
                const requiredDate = new Date(row['Required Date'] || Date.now());

                // Find if exists
                const existing = await prisma.scheduleLine.findFirst({
                    where: {
                        poNo,
                        itemCode,
                        requiredDate: {
                            equals: requiredDate
                        }
                    }
                });

                // Get supplier mapping
                let supplier = await prisma.supplier.findUnique({
                    where: { supplierCode: String(row['Supplier Code']) }
                });

                if (!existing) {
                    await prisma.scheduleLine.create({
                        data: {
                            supplierId: supplier ? supplier.id : null,
                            supplierCode: String(row['Supplier Code']),
                            supplierName: String(row['Supplier Name']),
                            buyerName: String(row['Buyer Name'] || req.user.name),
                            unit: String(row['Unit / Plant'] || ''),
                            poNo,
                            poDate: row['PO Date'] ? new Date(row['PO Date']) : new Date(),
                            itemCode,
                            itemName: String(row['Item Name'] || ''),
                            scheduleQty: Number(row['Schedule Qty']) || 0,
                            balanceQty: Number(row['Schedule Qty']) || 0,
                            requiredDate,
                            remarks: String(row['Remarks'] || ''),
                            uploadBatchId: uploadBatch.id,
                            status: 'PENDING'
                        }
                    });
                }
                successRows++;
            } catch (err) {
                console.error('Row insert error:', err);
                failedRows++;
            }
        }

        await prisma.uploadBatch.update({
            where: { id: uploadBatch.id },
            data: { successRows, failedRows }
        });

        res.json({
            message: 'Upload complete',
            total: data.length,
            success: successRows,
            failed: failedRows,
            batchId: uploadBatch.id
        });
    } catch (error) {
        console.error('Excel upload error:', error);
        res.status(500).json({ message: 'Server error processing Excel file' });
    }
};

exports.getSchedules = async (req, res) => {
    try {
        let where = {};
        if (req.user.role === 'SUPPLIER') {
            const supplier = await prisma.supplier.findUnique({ where: { id: req.user.supplierId } });
            if (supplier) {
                 where.supplierCode = supplier.supplierCode;
            }
        }
        
        const schedules = await prisma.scheduleLine.findMany({ 
            where,
            orderBy: { requiredDate: 'asc' },
            include: { shipments: true }
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
            include: { shipments: true }
        });
        if (!schedule) return res.status(404).json({ message: 'Not found' });
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
