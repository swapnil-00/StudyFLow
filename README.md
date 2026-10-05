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

Anyone can create a library with Google sign-in; it starts on the **Free plan (5 seats)**. Paid plans
(Basic: 100 seats for ₹5,000 one-time; Custom: ₹5,000 per 100 seats) and the **Automatic WhatsApp
notifications add-on** (₹10 per seat per month, prepaid) are bought from **Billing & Plan** inside the
app through Cashfree. All prices and limits live in `lib/plans.js`; limits are enforced server-side
in `api/write.js`. The scripts below cover manual payments (UPI / bank transfer) and the demo library.

### 1. Provision a Library by Hand (optional: customers can also self-sign-up)
```bash
# Dry run preview (default)
node scripts/create-library.js --name "Apex Study Lounge" --owner-email owner@example.com --owner-name "Rahul Sharma" --plan basic --city "Pune"

# Apply changes to database
node scripts/create-library.js --name "Apex Study Lounge" --owner-email owner@example.com --owner-name "Rahul Sharma" --plan basic --city "Pune" --apply
```
Plans: `free` (default, 5 seats) · `basic` (100 seats) · `custom --seats 300` (blocks of 100) · `demo`.
*Next step:* The owner signs in via Google OAuth on the web app and completes the initial setup wizard (branch, study hall, seating layout).

### 2. Record a Manual Payment / Change Plans or Seats
```bash
# Customer paid ₹5,000 by UPI for Basic
node scripts/set-plan.js ORG-12345678 --plan basic --apply

# Customer paid for 300 seats (₹15,000)
node scripts/set-plan.js ORG-12345678 --plan custom --seats 300 --apply

# Customer paid 3 months of automatic WhatsApp notifications (100 seats × ₹10 × 3 = ₹3,000)
node scripts/set-plan.js ORG-12345678 --auto-months 3 --apply

# Switch the add-on off / on without a payment (on requires an active paid period)
node scripts/set-plan.js ORG-12345678 --auto-cancel --apply
node scripts/set-plan.js ORG-12345678 --whatsapp automatic --apply
```
Every change goes through `lib/subscription.js`, the same code the Cashfree webhook uses, and is
recorded in `billing_orders` with `provider = 'manual'`.

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

