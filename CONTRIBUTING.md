# Contributing to FreelanceBill

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 15

### Development Setup

```bash
git clone https://github.com/milhero/freelancebill.git
cd freelancebill
pnpm install

# Database
createdb freelancebill
cp .env.example .env
# Edit .env — set DATABASE_URL and generate SESSION_SECRET:
#   openssl rand -hex 32

# Migrations & seed
cd packages/server
npx drizzle-kit push
npx tsx src/db/seed.ts

# Start dev servers
cd ../..
pnpm dev
```

Frontend: [http://localhost:5173](http://localhost:5173) | API: [http://localhost:3000](http://localhost:3000)

## Project Structure

```
freelancebill/
├── packages/
│   ├── server/          # Fastify REST API (TypeScript)
│   │   ├── src/db/      # Drizzle schema, migrations, seed
│   │   ├── src/routes/  # API endpoints
│   │   └── src/services/# Business logic, PDF generation
│   └── web/             # SvelteKit frontend (Svelte 5, Tailwind v4)
│       ├── src/lib/     # Components, stores, i18n, API client
│       └── src/routes/  # Pages
├── shared/              # Shared TypeScript types
└── deploy/              # Production configs (nginx, PM2)
```

## How to Contribute

### Reporting Bugs

Open an [issue](https://github.com/milhero/freelancebill/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS info if relevant

### Suggesting Features

Open an [issue](https://github.com/milhero/freelancebill/issues) and describe:
- The problem you're trying to solve
- Your proposed solution

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test locally with `pnpm dev` and Docker (`docker compose up --build`)
4. Submit a PR with a clear description of what changed and why

### Coding Guidelines

- **TypeScript** for all server and shared code
- **Svelte 5** syntax (runes, `$state`, `$derived`) for frontend
- **Tailwind CSS v4** for styling — no custom CSS unless necessary
- **Drizzle ORM** for database queries — no raw SQL
- **i18n**: Add translations to both `de.ts` and `en.ts` for any user-facing text

### Commit Messages

Use clear, descriptive messages:

```
feat: add recurring expense support
fix: correct VAT calculation for Kleinunternehmer
chore: update dependencies
docs: add API endpoint documentation
```

## Legal

By contributing, you agree that your contributions will be licensed under the same [CC BY-NC 4.0](LICENSE) license as the project.
