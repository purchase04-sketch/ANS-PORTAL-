# Shipment ASN Portal

A complete standalone **Advance Shipment Notice (ASN) Portal** for procurement shipment tracking. Excel-upload based — no ERP/SAP integration required.

---

## Features

### User Roles
| Role | Capabilities |
|------|-------------|
| **Admin** | Manage users & suppliers, view all data, view upload history |
| **Buyer** | Upload PO/schedule Excel, track shipments, filter, download reports, send reminder emails |
| **Supplier** | View own PO/schedule lines, add shipment details, upload Invoice/LR Copy/Packing List |

### Core Functionality
- 📊 **Dashboard** — 12 stat cards + 4 interactive charts (Recharts)
- 📤 **Excel Upload** — Drag & drop schedule upload with row-by-row validation
- 🚚 **Shipment Tracking** — Live status table with search, filters, pagination
- 📦 **Dispatch Entry** — Modal form with all 15 shipment fields
- 📎 **Document Uploads** — Invoice, LR Copy, Packing List (PDF/JPG/PNG, 10MB max)
- 📧 **Reminder Emails** — Nodemailer integration for pending/delayed items
- 📥 **Reports** — 6 downloadable Excel reports
- 🔄 **Auto Status** — Automatic status recalculation (Pending → Partial → Full → In Transit → Delayed)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS 3, React Router, Recharts, Lucide Icons |
| Backend | Node.js, Express 5, JWT Auth, Multer, XLSX, Nodemailer, Zod |
| Database | PostgreSQL + Prisma ORM v5 |
| File Storage | Local `backend/uploads/` folder |

---

## Quick Start

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** running locally

### 1. Clone the Repository
```bash
git clone https://github.com/purchase04-sketch/ANS-PORTAL-.git
cd ANS-PORTAL-
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and update with your PostgreSQL credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ans_portal?schema=public"
JWT_SECRET="your-secret-key"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="your-ethereal-user@ethereal.email"
SMTP_PASS="your-ethereal-password"
FRONTEND_URL="http://localhost:5173"
```

> **Tip:** Create a free test SMTP account at [ethereal.email](https://ethereal.email/) for email testing.

### 4. Create Database & Push Schema
```bash
# Create the database in PostgreSQL first:
# CREATE DATABASE ans_portal;

npx prisma db push
```

### 5. Seed Sample Data
```bash
node prisma/seed.js
```

### 6. Start Backend
```bash
npm run dev
```
Server runs on `http://localhost:5000`

### 7. Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173`

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shipment.com | Admin@123 |
| Buyer | buyer@shipment.com | Buyer@123 |
| Supplier | supplier@shipment.com | Supplier@123 |

---

## Project Structure
```
ANS-PORTAL-/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database models
│   │   └── seed.js                # Sample data seeder
│   ├── src/
│   │   ├── controllers/           # Business logic
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── emailController.js
│   │   │   ├── scheduleController.js
│   │   │   └── shipmentController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # JWT + role auth
│   │   ├── routes/                 # API endpoints
│   │   ├── utils/
│   │   │   └── prisma.js          # Prisma client
│   │   ├── app.js                 # Express app
│   │   └── server.js              # Server entry
│   ├── uploads/                   # File storage
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx        # Auth context
│   │   │   └── useToast.jsx       # Toast notifications
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx # Sidebar + header
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadSchedule.jsx
│   │   │   ├── ShipmentTracking.jsx
│   │   │   ├── SupplierSchedule.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── ReminderMail.jsx
│   │   │   ├── ManageUsers.jsx
│   │   │   ├── ManageSuppliers.jsx
│   │   │   ├── UploadHistory.jsx
│   │   │   ├── ShipmentHistory.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios + interceptors
│   │   └── utils/
│   │       └── helpers.js         # Shared utilities
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | JWT | Current user |
| GET/POST/PUT/DELETE | `/api/users` | Admin | User CRUD |
| GET/POST/PUT/DELETE | `/api/suppliers` | Admin | Supplier CRUD |
| POST | `/api/schedule/upload-excel` | Buyer/Admin | Upload Excel |
| GET | `/api/schedule` | JWT | Get schedule lines |
| GET | `/api/schedule/batches` | JWT | Upload batch history |
| POST | `/api/shipments` | JWT | Create shipment |
| GET | `/api/shipments` | JWT | List shipments |
| DELETE | `/api/shipments/:id` | JWT | Delete shipment |
| POST | `/api/shipments/:id/upload-documents` | JWT | Upload documents |
| GET | `/api/dashboard/summary` | JWT | Dashboard stats |
| GET | `/api/dashboard/supplier-wise` | JWT | Supplier chart data |
| GET | `/api/dashboard/status-wise` | JWT | Status chart data |
| GET | `/api/dashboard/daily-dispatch` | JWT | Dispatch trend |
| GET | `/api/dashboard/delayed` | JWT | Delayed chart data |
| GET | `/api/reports/*` | JWT | Excel report downloads |
| POST | `/api/email/send-reminder` | Buyer/Admin | Send reminder email |
| GET | `/api/email/logs` | Buyer/Admin | Email log history |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Database connection error | Ensure PostgreSQL is running. Check `DATABASE_URL` in `.env` |
| Empty dashboard | Run `node prisma/seed.js` to populate sample data |
| Upload errors | Ensure `backend/uploads/` directory exists |
| Prisma errors | Run `npx prisma generate` then `npx prisma db push` |
| Port conflicts | Change `PORT` in `.env` and `server.port` in `vite.config.js` |
| CORS errors | Check `FRONTEND_URL` in `.env` matches your frontend URL |

---

## Seed Data Included
- 3 Users (Admin, Buyer, Supplier)
- 5 Suppliers (Tata Steel, Bharat Forge, Sundaram Fasteners, Amara Raja, Havells)
- 2 Buyers
- 20 Schedule Lines with varied required dates
- 9 Shipment entries with realistic data
- Statuses auto-calculated (Pending, Partial, In Transit, Delayed)
