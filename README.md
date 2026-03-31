# FreelanceBill

Self-hosted business tracker for German freelancers and small businesses.

![GitHub Release](https://img.shields.io/github/v/release/milhero/freelancebill?style=flat&label=release)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D15-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Registry](https://img.shields.io/badge/registry-ghcr.io-blue.svg)

## Why FreelanceBill?

Existing invoicing tools either cost a monthly fee, don't comply with German tax law, or require trusting a third party with your financial data. FreelanceBill runs on your own server, generates legally compliant invoices, and just works — without subscriptions or vendor lock-in.

## Features

- **Dashboard** — KPIs, year comparison, top clients, aging report, monthly revenue chart
- **Invoices** — Create, manage, PDF generation (8 templates), recurring invoices
- **Legal Compliance** — §14 UStG compliant invoices, Kleinunternehmer (§19 UStG) or Regelbesteuerung
- **Dunning System** — Zahlungserinnerung, Mahnung, Letzte Mahnung
- **Quick Invoice** — One-off PDF invoices without database storage
- **Expenses** — Track with tags, payment methods, receipt uploads
- **Clients & Projects** — CRM with revenue tracking
- **Document Archive** — Auto-archive invoices, upload external documents (§14b UStG)
- **CSV Export** — Income, expenses, summary reports for tax filing
- **Full Backup** — ZIP backup & restore (data + files)
- **Dark Mode** — Light, dark, system preference
- **i18n** — German and English
- **PWA** — Installable on mobile and desktop

## Quick Start

Requires only [Docker](https://docs.docker.com/get-docker/).

### Option A: Download (Recommended)

No Git required. Download one file and start:

```bash
# Download the compose file
curl -LO https://github.com/milhero/freelancebill/releases/latest/download/docker-compose.prod.yml

# Start FreelanceBill
docker compose -f docker-compose.prod.yml up -d
```

Open [http://localhost](http://localhost) — done.

**Default login:** `admin@example.com` / `changeme123`

> **⚠️ Change the default password immediately after first login!**

**Update to a new version:**
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Option B: Build from Source

```bash
git clone https://github.com/milhero/freelancebill.git
cd freelancebill
docker compose up -d
```

Open [http://localhost](http://localhost) — done.

### Production Configuration

For production, create a `.env` file next to the compose file:
```bash
DB_PASSWORD=your-secure-db-password
SESSION_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://yourdomain.com
PORT=80
```

## Manual Setup

Prerequisites: **Node.js** >= 20, **pnpm** >= 9, **PostgreSQL** >= 15

### Quick Start

```bash
# 1. Clone & install
git clone https://github.com/milhero/freelancebill.git
cd freelancebill
pnpm install

# 2. Database setup
createdb freelancebill
cp .env.example .env
# Edit .env — set DATABASE_URL and generate random secrets:
#   openssl rand -hex 32    (for SESSION_SECRET)

# 3. Run migrations & seed demo data
cd packages/server
npx drizzle-kit push
npx tsx src/db/seed.ts

# 4. Start development
cd ../..
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

**Default login:** `admin@example.com` / `changeme123`

> **⚠️ Change the default password immediately after first login!**

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `SESSION_SECRET` | Session encryption key (min 32 chars in prod) | — (generate with `openssl rand -hex 32`) |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

## Project Structure

```
freelancebill/
├── packages/
│   ├── server/          # Fastify REST API
│   │   ├── src/
│   │   │   ├── db/      # Schema, migrations, seed
│   │   │   ├── routes/  # API endpoints
│   │   │   ├── services/# Business logic + PDF generation
│   │   │   └── middleware/
│   │   └── uploads/     # Receipts & documents
│   └── web/             # SvelteKit frontend
│       ├── src/
│       │   ├── lib/     # Components, API clients, i18n, stores
│       │   └── routes/  # Pages
│       └── static/      # PWA assets
├── shared/              # Shared TypeScript types & utils
└── deploy/              # Nginx, PM2, VPS setup script
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit, Svelte 5, Tailwind CSS v4 |
| Backend | Node.js, Fastify 5, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| PDF | pdf-lib (8 invoice templates) |
| Auth | Session-based (bcrypt + HttpOnly cookies) |

## Deployment

### Docker (Recommended)

**Pre-built images (fastest):**
```bash
curl -LO https://github.com/milhero/freelancebill/releases/latest/download/docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d
```

**Build from source:**
```bash
git clone https://github.com/milhero/freelancebill.git
cd freelancebill
docker compose up -d
```

Add a reverse proxy (Caddy, Traefik, nginx) in front for HTTPS.

### Manual VPS

Production config in `deploy/`:

- `nginx.conf` — Reverse proxy with SSL, security headers, TLS 1.2+
- `ecosystem.config.cjs` — PM2 config with user isolation
- `setup.sh` — VPS provisioning (Node.js, PostgreSQL, Nginx, Certbot)

Update `server_name` in `nginx.conf` to your domain before deploying.

## Legal Compliance (Germany)

- Sequential invoice numbering (§14 Abs. 4 UStG)
- All required invoice fields per §14 UStG
- Kleinunternehmerregelung (§19 UStG) with tax-free allowance tracking
- Standard taxation with configurable VAT rate
- Tax ID / VAT ID on invoices
- Dunning letters (3 levels per German business practice)
- Document archiving (§14b UStG)

> This software is provided as-is. Consult a tax advisor for your specific situation.

## License

[CC BY-NC 4.0](LICENSE) — Non-commercial use only. Attribution required.

Copyright (c) 2026 Milan Ronnenberg
