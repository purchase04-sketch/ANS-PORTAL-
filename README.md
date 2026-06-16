# Shipment ASN Portal

A complete standalone Shipment ASN (Advance Shipment Notice) Portal for procurement shipment tracking.

## Tech Stack
* **Frontend**: React, Vite, Tailwind CSS, React Router, React Hook Form, Recharts, TanStack Table
* **Backend**: Node.js, Express.js, PostgreSQL, Prisma, Multer, Nodemailer
* **Database**: PostgreSQL

## Installation & Setup

### Prerequisites
* Node.js (v18+)
* PostgreSQL running locally or remotely

### Backend Setup
1. Open terminal and navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Configure Environment Variables:
   Update the \`.env\` file in the \`backend\` directory with your PostgreSQL connection string:
   \`\`\`env
   DATABASE_URL="postgresql://user:password@localhost:5432/ans_portal?schema=public"
   PORT=5000
   JWT_SECRET="supersecretjwtkeyforansportal"
   SMTP_HOST="smtp.ethereal.email"
   SMTP_PORT=587
   SMTP_USER="ethereal_user@ethereal.email"
   SMTP_PASS="ethereal_password"
   FRONTEND_URL="http://localhost:5173"
   \`\`\`
4. Run Prisma Migration & Push Schema:
   \`\`\`bash
   npx prisma db push
   \`\`\`
5. Seed Dummy Data:
   \`\`\`bash
   node prisma/seed.js
   \`\`\`
6. Start Backend Server:
   \`\`\`bash
   npm run dev
   \`\`\`
   *(Server starts on port 5000)*

### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   \`\`\`bash
   cd frontend
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start Frontend Dev Server:
   \`\`\`bash
   npm run dev
   \`\`\`
   *(App runs on http://localhost:5173)*

### Demo Login Credentials
Use the following credentials seeded in the database:
- **Admin**: admin@shipment.com / Admin@123
- **Buyer**: buyer@shipment.com / Buyer@123
- **Supplier**: supplier@shipment.com / Supplier@123

## Troubleshooting
- **Database Connection Error**: Ensure PostgreSQL is running and the `DATABASE_URL` in `.env` is correct.
- **Empty Dashboard**: Make sure you have run the seed script `node prisma/seed.js`.
- **Upload Errors**: Ensure the `uploads/` folder exists inside the `backend` directory.
