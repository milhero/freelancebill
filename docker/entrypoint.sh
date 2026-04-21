#!/bin/sh
set -e

echo "=== FreelanceBill Server Starting ==="

# Run database migrations (idempotent — safe to run every time)
echo "Applying database schema..."
cd /app/packages/server
npx drizzle-kit push --force 2>&1 || {
  echo "ERROR: Migration failed. Is the database ready?"
  exit 1
}

# Seed demo data only if database is empty (no users exist)
USER_COUNT=$(node -e "
  import pg from 'pg';
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query('SELECT COUNT(*) FROM users');
  console.log(res.rows[0].count);
  await pool.end();
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "Empty database detected — seeding demo data..."
  npx tsx src/db/seed.ts
else
  echo "Database already has data — skipping seed."
fi

# Start the server
echo "Starting server on port ${PORT:-3000}..."
cd /app
exec node packages/server/dist/index.js
