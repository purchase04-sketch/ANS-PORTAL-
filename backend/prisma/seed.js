const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@shipment.com' } });
  if (existingAdmin) {
    console.log('Seed data already exists. Skipping...');
    return;
  }

  console.log('Starting seed...');

  const adminPwd = await bcrypt.hash('Admin@123', 10);
  const buyerPwd = await bcrypt.hash('Buyer@123', 10);
  const supplierPwd = await bcrypt.hash('Supplier@123', 10);

  // === Create Buyers ===
  const buyer1 = await prisma.buyer.create({ data: { buyerName: 'Rajesh Kumar', buyerEmail: 'buyer@shipment.com', unit: 'Plant-1' } });
  const buyer2 = await prisma.buyer.create({ data: { buyerName: 'Anita Sharma', buyerEmail: 'anita@shipment.com', unit: 'Plant-2' } });

  // === Create Suppliers ===
  const suppliers = [];
  const supplierData = [
    { supplierCode: 'SUP001', supplierName: 'Tata Steel Ltd', supplierEmail: 'supplier@shipment.com', contactPerson: 'Vikram Mehta', phone: '9876543210', address: 'Jamshedpur, Jharkhand' },
    { supplierCode: 'SUP002', supplierName: 'Bharat Forge Ltd', supplierEmail: 'supplier2@example.com', contactPerson: 'Sunil Patil', phone: '9876543211', address: 'Pune, Maharashtra' },
    { supplierCode: 'SUP003', supplierName: 'Sundaram Fasteners', supplierEmail: 'supplier3@example.com', contactPerson: 'Ravi Sundaram', phone: '9876543212', address: 'Chennai, Tamil Nadu' },
    { supplierCode: 'SUP004', supplierName: 'Amara Raja Batteries', supplierEmail: 'supplier4@example.com', contactPerson: 'Kiran Reddy', phone: '9876543213', address: 'Tirupati, Andhra Pradesh' },
    { supplierCode: 'SUP005', supplierName: 'Havells India', supplierEmail: 'supplier5@example.com', contactPerson: 'Deepak Gupta', phone: '9876543214', address: 'Noida, Uttar Pradesh' },
  ];
  for (const sd of supplierData) {
    suppliers.push(await prisma.supplier.create({ data: sd }));
  }

  // === Create Users ===
  await prisma.user.create({ data: { name: 'Admin User', email: 'admin@shipment.com', passwordHash: adminPwd, role: 'ADMIN' } });
  await prisma.user.create({ data: { name: 'Rajesh Kumar', email: 'buyer@shipment.com', passwordHash: buyerPwd, role: 'BUYER', buyerId: buyer1.id } });
  await prisma.user.create({ data: { name: 'Vikram Mehta', email: 'supplier@shipment.com', passwordHash: supplierPwd, role: 'SUPPLIER', supplierId: suppliers[0].id } });

  // === Create Upload Batch ===
  const batch = await prisma.uploadBatch.create({
    data: { uploadedBy: 'buyer@shipment.com', fileName: 'seed_schedule.xlsx', totalRows: 20, successRows: 20, failedRows: 0 }
  });

  // === Create 20 Schedule Lines ===
  const items = [
    { code: 'MS-PLATE-6MM', name: 'MS Plate 6mm' },
    { code: 'SS-ROD-12MM', name: 'SS Rod 12mm' },
    { code: 'HEX-BOLT-M10', name: 'Hex Bolt M10x40' },
    { code: 'BEARING-6205', name: 'Ball Bearing 6205 ZZ' },
    { code: 'CABLE-4SQMM', name: 'Copper Cable 4 Sq mm' },
    { code: 'GASKET-DN50', name: 'Gasket DN50 PN16' },
    { code: 'FLANGE-DN80', name: 'Blind Flange DN80' },
    { code: 'PIPE-GI-2IN', name: 'GI Pipe 2 Inch' },
    { code: 'VALVE-GATE-3', name: 'Gate Valve 3 Inch' },
    { code: 'MOTOR-1HP', name: 'Electric Motor 1HP' },
  ];

  const now = new Date();
  const scheduleLines = [];

  for (let i = 0; i < 20; i++) {
    const sup = suppliers[i % 5];
    const buyer = i % 2 === 0 ? buyer1 : buyer2;
    const item = items[i % 10];
    const qty = (i + 1) * 50;
    const requiredDate = new Date(now);
    requiredDate.setDate(requiredDate.getDate() + (i < 5 ? -5 : i < 10 ? 3 : i < 15 ? 10 : 20));

    const line = await prisma.scheduleLine.create({
      data: {
        supplierId: sup.id,
        buyerId: buyer.id,
        supplierCode: sup.supplierCode,
        supplierName: sup.supplierName,
        buyerName: buyer.buyerName,
        unit: buyer.unit,
        poNo: `PO-2026-${String(1001 + i)}`,
        poDate: new Date('2026-05-15'),
        itemCode: item.code,
        itemName: item.name,
        scheduleQty: qty,
        balanceQty: qty,
        requiredDate,
        remarks: i % 3 === 0 ? 'Urgent requirement' : '',
        uploadBatchId: batch.id,
        status: 'PENDING'
      }
    });
    scheduleLines.push(line);
  }

  // === Create sample Shipments for first 8 lines ===
  const shipmentData = [
    { lineIdx: 0, dispatchQty: 50, daysAgo: 3, invoiceNo: 'INV-001', lrNo: 'LR-001', transporter: 'VRL Logistics', vehicle: 'MH-12-AB-1234' },
    { lineIdx: 1, dispatchQty: 50, daysAgo: 2, invoiceNo: 'INV-002', lrNo: 'LR-002', transporter: 'Gati', vehicle: 'DL-05-CD-5678' },
    { lineIdx: 2, dispatchQty: 100, daysAgo: 1, invoiceNo: 'INV-003', lrNo: 'LR-003', transporter: 'DTDC', vehicle: 'TN-22-EF-9012' },
    { lineIdx: 2, dispatchQty: 50, daysAgo: 0, invoiceNo: 'INV-003A', lrNo: 'LR-003A', transporter: 'DTDC', vehicle: 'TN-22-GH-3456' },
    { lineIdx: 3, dispatchQty: 200, daysAgo: 4, invoiceNo: 'INV-004', lrNo: 'LR-004', transporter: 'Safexpress', vehicle: 'AP-09-IJ-7890' },
    { lineIdx: 4, dispatchQty: 250, daysAgo: 5, invoiceNo: 'INV-005', lrNo: 'LR-005', transporter: 'BlueDart', vehicle: 'UP-32-KL-1111' },
    { lineIdx: 5, dispatchQty: 100, daysAgo: 1, invoiceNo: 'INV-006', lrNo: 'LR-006', transporter: 'VRL Logistics', vehicle: 'MH-04-MN-2222' },
    { lineIdx: 6, dispatchQty: 350, daysAgo: 0, invoiceNo: 'INV-007', lrNo: 'LR-007', transporter: 'Gati', vehicle: 'RJ-14-OP-3333' },
    { lineIdx: 7, dispatchQty: 100, daysAgo: 2, invoiceNo: 'INV-008', lrNo: 'LR-008', transporter: 'TCI Express', vehicle: 'KA-01-QR-4444' },
  ];

  for (const sd of shipmentData) {
    const line = scheduleLines[sd.lineIdx];
    const dispatchDate = new Date(now);
    dispatchDate.setDate(dispatchDate.getDate() - sd.daysAgo);
    const expectedDelivery = new Date(dispatchDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + 3);

    await prisma.shipment.create({
      data: {
        scheduleLineId: line.id,
        dispatchQty: sd.dispatchQty,
        dispatchDate,
        expectedDeliveryDate: expectedDelivery,
        invoiceNo: sd.invoiceNo,
        invoiceDate: dispatchDate,
        lrNo: sd.lrNo,
        lrDate: dispatchDate,
        transporterName: sd.transporter,
        vehicleNo: sd.vehicle,
        numberOfBoxes: Math.ceil(sd.dispatchQty / 25),
        packingDetails: `${Math.ceil(sd.dispatchQty / 25)} wooden crates`,
        shipmentRemarks: 'Dispatched as per schedule',
        createdBy: 'supplier@shipment.com'
      }
    });
  }

  // === Recalculate statuses for all lines with shipments ===
  const affectedLineIds = [...new Set(shipmentData.map(s => scheduleLines[s.lineIdx].id))];
  for (const lineId of affectedLineIds) {
    const line = await prisma.scheduleLine.findUnique({ where: { id: lineId }, include: { shipments: true } });
    let totalDispatchQty = 0;
    let hasInTransit = false;
    let latestExpected = null;

    line.shipments.forEach(s => {
      totalDispatchQty += s.dispatchQty;
      if (s.expectedDeliveryDate) {
        const ed = new Date(s.expectedDeliveryDate);
        if (ed >= now) hasInTransit = true;
        if (!latestExpected || ed > latestExpected) latestExpected = ed;
      }
    });

    let balanceQty = line.scheduleQty - totalDispatchQty;
    if (balanceQty < 0) balanceQty = 0;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let status = 'PENDING';

    if (totalDispatchQty === 0) {
      status = new Date(line.requiredDate) < today ? 'PENDING_DELAYED' : 'PENDING';
    } else if (totalDispatchQty >= line.scheduleQty) {
      status = 'FULLY_DISPATCHED';
    } else {
      status = 'PARTIALLY_DISPATCHED';
    }

    if (line.shipments.length > 0 && hasInTransit && status !== 'FULLY_DISPATCHED') {
      status = 'IN_TRANSIT';
    }
    if (latestExpected && latestExpected < today && status !== 'FULLY_DISPATCHED') {
      status = 'DELAYED';
    }

    await prisma.scheduleLine.update({ where: { id: lineId }, data: { totalDispatchQty, balanceQty, status } });
  }

  // Recalculate lines without shipments that are past due
  for (let i = 0; i < scheduleLines.length; i++) {
    if (!affectedLineIds.includes(scheduleLines[i].id)) {
      const line = scheduleLines[i];
      if (new Date(line.requiredDate) < now) {
        await prisma.scheduleLine.update({ where: { id: line.id }, data: { status: 'PENDING_DELAYED' } });
      }
    }
  }

  console.log('Seed completed successfully!');
  console.log('  - 3 users (admin, buyer, supplier)');
  console.log('  - 5 suppliers');
  console.log('  - 2 buyers');
  console.log('  - 20 schedule lines');
  console.log('  - 9 shipment entries');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:    admin@shipment.com / Admin@123');
  console.log('  Buyer:    buyer@shipment.com / Buyer@123');
  console.log('  Supplier: supplier@shipment.com / Supplier@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
