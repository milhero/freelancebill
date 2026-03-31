# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-31

### Initial Public Release

**Core Features:**
- Dashboard with KPIs, year comparison, top clients, aging report
- Invoice management with PDF generation (8 templates)
- Recurring invoices (monthly, quarterly, yearly)
- Dunning system (Zahlungserinnerung, Mahnung, Letzte Mahnung)
- Quick Invoice for one-off PDFs
- Expense tracking with tags and receipt uploads
- Client & project CRM with revenue statistics
- Document archive with auto-archiving
- CSV export (income, expenses, summary)
- Full ZIP backup & restore

**Compliance:**
- German tax law compliance (§14 UStG, §19 UStG)
- Kleinunternehmerregelung and Regelbesteuerung support
- Sequential invoice numbering

**Technical:**
- Docker Compose setup (one-command deployment)
- Dark mode, i18n (German/English), PWA
- Session-based authentication with bcrypt
- PostgreSQL with Drizzle ORM
