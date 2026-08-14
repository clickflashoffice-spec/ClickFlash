# Management Hub

> **Business management dashboard for photography studios**

## ✨ Features

### 📊 Dashboard & Analytics
- **Real-time Statistics** - Revenue, orders, photos, albums
- **Time-based Filtering** - Today, 7 Days, 30 Days views
- **Sales Charts** - Visual revenue tracking
- **Recent Orders** - Quick access to latest orders
- **Top Photographers** - Performance rankings
- **Albums to Process** - Workflow management

### 💼 Business Management
- **Destinations** - Manage shooting locations
- **Reports** - Financial and operational reports
- **Expenses** - Track business expenses
- **Capital** - Equipment and asset management
- **Payroll** - Photographer compensation
- **Performance** - KPI tracking

### ⚙️ Settings & Configuration
- **E-commerce Settings** - Pricing, payments, Stripe
- **Global Settings** - System configuration
- **User Management** - Roles and permissions
- **Documentation** - Built-in help system

## 🏗️ Architecture

### Backend (`backend/`)
```
backend/
├── server.js           # Main Express server (110KB)
├── db.js               # Database manager
├── auth.js             # Authentication utilities
├── validation.js       # Request validation
├── errorHandler.js     # Error handling
├── auditLogger.js      # Security auditing
├── logger.js           # Application logging
├── rateLimiter.js      # API rate limiting
├── photoProcessor.js   # Image processing
├── routes/             # API routes
│   ├── customerRoutes.js
│   ├── paymentRoutes.js
│   └── syncRoutes.js
└── migrations/         # Database migrations
```

**Features:**
- JWT authentication
- SQLite database (better-sqlite3)
- File upload handling (formidable)
- Rate limiting
- Audit logging
- Photo processing
- Windows PowerShell integration

### Frontend (`src/`)
```
src/
├── App.tsx                    # Main app component
├── components/
│   ├── Dashboard.tsx          # Main dashboard
│   ├── Login.tsx              # Authentication
│   ├── management/            # Management pages
│   │   ├── ManagementLayout.tsx
│   │   ├── ManagementDashboard.tsx
│   │   ├── DestinationsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── ExpensesPage.tsx
│   │   ├── CapitalPage.tsx
│   │   ├── PayrollPage.tsx
│   │   └── ... (12+ pages)
│   ├── dashboard/widgets/     # Dashboard components
│   ├── common/                # Shared UI components
│   └── modals/                # Modal dialogs
├── hooks/                     # Custom React hooks
├── services/                  # API services
└── utils/                     # Utilities
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start frontend (Vite)
npm run dev

# Start backend (separate terminal)
npm start
```

### Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 🔧 Configuration

Create `.env` file:

```env
# Server
PORT=8092
DATA_DIR=./pb_data
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Logging
LOG_LEVEL=INFO
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user

### Data Management
- `GET /api/:collection` - List records
- `POST /api/:collection` - Create record
- `PATCH /api/:collection/:id` - Update record
- `DELETE /api/:collection/:id` - Delete record

### File Operations
- `POST /api/upload` - File upload
- `GET /uploads/:path` - Serve uploaded files

### Customer & Payments
- `POST /api/customers/notify` - Send notification
- `POST /api/payments/process` - Process payment
- `GET /api/payments/stripe-key` - Get Stripe key

### Cloud Sync
- `POST /api/cloud/sync-album` - Sync album
- `POST /api/cloud/upload-photo` - Upload photo
- `GET /api/cloud/status` - Sync status

## 🔐 Permissions

The system uses role-based permissions:

| Permission | Description |
|------------|-------------|
| `viewManagementDashboard` | Access dashboard |
| `viewDestinations` | Manage destinations |
| `viewReports` | View reports |
| `viewExpenses` | Manage expenses |
| `viewCapital` | Manage capital |
| `viewPayroll` | Process payroll |
| `viewGlobalSettings` | System settings |

## 🐳 Docker

```bash
# Build image
docker build -t clickflash-management .

# Run container
docker run -p 8092:8092 -v pb_data:/app/pb_data clickflash-management
```

## 📊 Default Login

```
Username: admin
Password: admin123
```

**⚠️ Change default credentials in production!**

## 🔗 Integration

Connects to:
- **Master Portal** - Sync orders, albums
- **Customer Gallery** - Photo delivery
- **Money Trash Uploader** - Receive uploads
- **Stripe** - Payment processing

## 📝 Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT tokens
- **Charts:** Chart.js
- **Payments:** Stripe

## 📄 License

Private - ClickFlash Photography Solutions
