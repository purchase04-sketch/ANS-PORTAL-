const nodemailer = require('nodemailer');
const prisma = require('../utils/prisma');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendReminder = async (req, res) => {
    try {
        const { scheduleLineId } = req.body;
        
        const line = await prisma.scheduleLine.findUnique({
            where: { id: scheduleLineId },
            include: { supplier: true }
        });

        if (!line) return res.status(404).json({ message: 'Schedule line not found' });

        const toEmail = line.supplier?.supplierEmail || 'supplier@example.com';
        const subject = `Pending Shipment Update Required - PO No. ${line.poNo}`;
        
        const body = `Dear Sir,

Please update the shipment status for the below pending material at the earliest.

Supplier: ${line.supplierName}
PO No.: ${line.poNo}
Item Code: ${line.itemCode}
Item Name: ${line.itemName}
Schedule Qty: ${line.scheduleQty}
Dispatch Qty: ${line.totalDispatchQty}
Balance Qty: ${line.balanceQty}
Required Date: ${new Date(line.requiredDate).toDateString()}
Current Status: ${line.status}

Kindly confirm the dispatch plan with invoice/LR details.

Regards,
Purchase Team
`;

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: toEmail,
            subject,
            text: body
        });

        await prisma.emailLog.create({
            data: {
                sentBy: req.user.email,
                supplierId: line.supplierId,
                scheduleLineId: line.id,
                toEmail,
                subject,
                body,
                status: 'SENT'
            }
        });

        res.json({ message: 'Reminder email sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send email' });
    }
};
