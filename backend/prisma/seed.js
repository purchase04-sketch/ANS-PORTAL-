const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Check if users already exist
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@shipment.com' } });
  if (existingAdmin) {
    console.log('Seed data already exists. Exiting...');
    return;
  }

  console.log('Starting seed...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const buyerPassword = await bcrypt.hash('Buyer@123', 10);
  const supplierPassword = await bcrypt.hash('Supplier@123', 10);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@shipment.com',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  });

  const buyerRole = await prisma.buyer.create({
    data: {
      buyerName: 'Demo Buyer',
      buyerEmail: 'buyer@shipment.com',
      unit: 'Plant-1'
    }
  });

  const buyer = await prisma.user.create({
    data: {
      name: 'Demo Buyer User',
      email: 'buyer@shipment.com',
      passwordHash: buyerPassword,
      role: 'BUYER',
      buyerId: buyerRole.id
    }
  });

  const supplierRole = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP001',
      supplierName: 'Demo Supplier',
      supplierEmail: 'supplier@shipment.com',
      contactPerson: 'Mr. Supplier',
      phone: '9876543210',
      address: 'Industrial Area Phase 1'
    }
  });

  const supplier = await prisma.user.create({
    data: {
      name: 'Demo Supplier User',
      email: 'supplier@shipment.com',
      passwordHash: supplierPassword,
      role: 'SUPPLIER',
      supplierId: supplierRole.id
    }
  });

  // Create some extra dummy suppliers
  for(let i=2; i<=5; i++) {
    await prisma.supplier.create({
      data: {
        supplierCode: `SUP00${i}`,
        supplierName: `Sample Supplier ${i}`,
        supplierEmail: `supplier${i}@example.com`,
        contactPerson: `Contact ${i}`
      }
    });
  }

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
