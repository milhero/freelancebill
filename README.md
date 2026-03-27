# FreelanceBill

Self-hosted business tracker for German freelancers and small businesses.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)

## Features

- **Dashboard** — KPIs, year comparison, top clients, aging report, monthly chart
- **Invoices** — Create, manage, PDF generation (§14 UStG compliant), recurring invoices
- **Quick Invoice** — One-off PDF invoices without database storage
- **Dunning System** — Payment reminders (Zahlungserinnerung, Mahnung, Letzte Mahnung)
- **Expenses** — Track with tags, payment methods, receipt uploads
- **Clients & Projects** — Full CRM with revenue tracking
- **Document Archive** — Auto-archive invoices, upload external documents
- **CSV Export** — Income, expenses, summary reports
- **Tax Compliance** — Kleinunternehmer (§19 UStG) or Regelbesteuerung, with legal notes
- **Dark Mode** — Light, dark, and system preference
- **i18n** — German and English
- **PWA** — Installable on iPhone, iPad, Mac
- **Data Backup** — Full JSON backup & restore

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit, Svelte 5, Tailwind CSS v4 |
| Backend | Node.js, Fastify, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| PDF | pdf-lib |
| Auth | JWT, bcrypt |

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 15

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/milhero/freelancebill.git
cd freelancebill
pnpm install
```

### 2. Database Setup

```bash
createdb freelancebill

cp .env.example .env
# Edit .env with your database credentials and a random JWT secret
```

### 3. Run Migrations & Seed

```bash
cd packages/server
npx tsx src/db/seed.ts
```

This creates all tables, a default user, and sample data.

### 4. Start Development

```bash
# Terminal 1: Backend
cd packages/server
npx tsx src/index.ts

# Terminal 2: Frontend
cd packages/web
npx vite dev --port 5174
```

Open [http://localhost:5174](http://localhost:5174)

### Default Login

```
Email: kontakt@milanronnenberg.de
Password: changeme123
```

> Change the password immediately after first login via Settings.

## Project Structure

```
freelancebill/
├── packages/
│   ├── server/              # Fastify API server
│   │   ├── src/
│   │   │   ├── db/          # Schema, migrations, seed
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth middleware
│   │   │   └── utils/       # Helpers
│   │   └── package.json
│   └── web/                 # SvelteKit frontend
│       ├── src/
│       │   ├── lib/         # Components, API clients, i18n, stores
│       │   ├── routes/      # Pages
│       │   └── app.css      # Tailwind theme
│       └── package.json
├── shared/                  # Shared types, utils, constants
├── deploy/                  # Nginx, PM2, setup script
└── package.json             # Workspace root
```

## Deployment

Production deployment files are in `deploy/`:

- `nginx.conf` — Reverse proxy with SSL termination
- `ecosystem.config.cjs` — PM2 process manager config
- `setup.sh` — VPS provisioning script (Node.js, PostgreSQL, Nginx, Certbot)

```bash
# On your VPS
chmod +x deploy/setup.sh
./deploy/setup.sh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/password` | Change password |
| GET/PUT | `/api/settings` | User settings |
| GET/POST/PUT/DELETE | `/api/clients` | Client CRUD |
| GET/POST/PUT/DELETE | `/api/projects` | Project CRUD |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoice CRUD |
| POST | `/api/invoices/:id/status` | Update payment status |
| GET | `/api/invoices/:id/pdf` | Download invoice PDF |
| POST | `/api/invoices/:id/reminder` | Generate dunning letter |
| POST | `/api/invoices/preview-pdf` | Live PDF preview |
| POST | `/api/invoices/process-recurring` | Process recurring invoices |
| GET/POST/PUT/DELETE | `/api/expenses` | Expense CRUD |
| POST | `/api/expenses/:id/receipt` | Upload receipt |
| GET/POST/PUT/DELETE | `/api/tags` | Tag CRUD |
| GET/POST/DELETE | `/api/documents` | Document archive |
| GET | `/api/dashboard` | Dashboard data |
| GET | `/api/exports/:type` | CSV export (income/expenses/summary) |
| GET | `/api/backup` | Download full backup |
| POST | `/api/backup/restore` | Restore from backup |

## Legal Compliance (Germany)

- Sequential invoice numbering (§14 Abs. 4 UStG)
- All required invoice fields (§14 UStG)
- Kleinunternehmerregelung support (§19 UStG)
- Standard taxation (Regelbesteuerung) with configurable VAT rate
- Tax ID / VAT ID on invoices
- Dunning letters (Zahlungserinnerung, Mahnung, Letzte Mahnung)
- Document archiving (§14b UStG — 10 year retention)

> This software is provided as-is. Consult a tax advisor for your specific situation.

## License

[MIT](LICENSE) — Milan Ronnenberg, 2026
