# 📚 StudyFlow — Study Library & Reading Room Management SaaS

> A modern, production-grade Study Library Management web application built for owners and admins of reading rooms, study libraries, coaching spaces, and self-study centers.

---

## ✨ Features

- **🪑 Visual Interactive Seat Map (Bus-Ticket Style)**:
  - Real-time seat statuses: *Available*, *Occupied*, *Reserved*, *Payment Due*, *Expiring Soon*, *Maintenance*, *Blocked*.
  - Multi-floor and multi-room management (General Study Hall, Quiet Zone, AC Premium Rooms).
  - Click any seat to view full student details, membership plan, expiry date, and quick action drawers.
- **👨‍🎓 Student Management**:
  - Complete student profiles with contact info, ID proof records, seat history, and payment logs.
  - Search and filter students by branch, plan, and payment status.
- **💳 Memberships & Plans**:
  - Flexible plans (Weekly, Monthly, Quarterly, Half-Yearly, Annual).
  - Automatic expiry alerts and status tracking.
- **💰 Payments & Dues**:
  - Track payments across UPI, Cash, Cards, and Net Banking.
  - Automatic receipt generation and pending dues reports.
- **🕒 Attendance Tracking**:
  - Record check-ins and check-outs by date and shift.
- **☁️ Neon Database (PostgreSQL)**:
  - Cloud database integration with 18 relational tables, foreign keys, and indexes.
  - One-click migration and seeding tool (`npm run migrate`).
- **🎨 Design System**:
  - Modern UI/UX typography powered by **Inter** with refined negative tracking.
  - Sleek dark CTA buttons, subtle borders, status pills with live indicator dots, and responsive cards.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/swapnil-00/StudyFLow.git
cd StudyFLow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Database
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and paste your **[Neon DB](https://neon.tech)** PostgreSQL connection string:
```env
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.neon.tech/neondb?sslmode=require
```

### 4. Run Database Migration
Create all tables and seed sample data in your Neon cloud database:
```bash
npm run migrate
```

### 5. Launch Development Server
```bash
npm start
```
Open **`http://localhost:5173`** in your browser.

---

## 🏗️ Project Architecture

```text
studyflow/
├── css/                  # Curated design system & stylesheets
│   ├── base.css          # Reset, scrollbars, utility styles
│   ├── components.css    # Buttons, cards, modals, tables, badges
│   ├── layout.css        # Responsive app layout, sidebar, header
│   ├── pages.css         # Page-specific styling
│   └── tokens.css        # Color tokens, typography, shadows, radius
├── db/                   # Neon PostgreSQL integration
│   ├── migrate.js        # Automated migration & seeder tool
│   └── schema.sql        # 18-table relational PostgreSQL DDL
├── js/                   # Application logic
│   ├── pages/            # Modular page renderers
│   ├── app.js            # App core, routing, modal & drawer controllers
│   ├── bundle.js         # Unified client bundle
│   ├── icons.js          # SVG icon library
│   ├── seed.js           # Demo data seeder
│   └── store.js          # Reactive store layer
├── build.js              # Bundle compilation script
├── server.js             # Zero-dependency Node.js HTTP server & API
├── .env.example          # Environment variables template
└── README.md             # Project documentation
```

---

## 🛠️ Admin: Managing Libraries (Owner CLI)

StudyFlow uses an owner-controlled provisioning model. Stranger self-service signups and free trials are disabled on the web. Only the platform owner provisions customer libraries and manages plans via local CLI scripts.

### 1. Provision a New Customer Library
```bash
# Dry run preview (default)
node scripts/create-library.js --name "Apex Study Lounge" --owner-email owner@example.com --owner-name "Rahul Sharma" --plan starter --seats 100 --city "Pune"

# Apply changes to database
node scripts/create-library.js --name "Apex Study Lounge" --owner-email owner@example.com --owner-name "Rahul Sharma" --plan starter --seats 100 --city "Pune" --apply
```
*Next step:* The owner signs in via Google OAuth on the web app and completes the initial setup wizard (branch, study hall, seating layout).

### 2. Change Plans or Seat Limits
```bash
# Upgrade or change plan
node scripts/set-plan.js ORG-12345678 --plan growth --apply

# Override seat capacity limit
node scripts/set-plan.js ORG-12345678 --seats 300 --apply
```

### 3. Suspend or Reactivate a Library
```bash
# Suspend an organization (blocks all writes with 403 SUBSCRIPTION_SUSPENDED, read-only mode)
node scripts/set-plan.js ORG-12345678 --status suspended --apply

# Reactivate organization
node scripts/set-plan.js ORG-12345678 --status active --apply
```

### 4. Configure & Seed the Demo Library
```bash
# 1. Create demo organization for owner
node scripts/create-library.js --name "Swapnil Sample Library" --owner-email srchaudhari324@gmail.com --owner-name "Swapnil Chaudhari" --plan demo --seats 100 --apply

# 2. Lock demo organization (blocks invitations with 403 DEMO_LOCKED)
node scripts/set-demo.js --owner-email srchaudhari324@gmail.com --apply

# 3. Owner completes wizard in web app, then seed realistic demo data
node scripts/seed-demo.js --apply --email srchaudhari324@gmail.com
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

