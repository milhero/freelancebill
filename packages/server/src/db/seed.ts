import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from './schema/users.js';
import { settings } from './schema/settings.js';
import { hashPassword } from '../utils/password.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://freelancebill:password@localhost:5432/freelancebill',
});

const db = drizzle(pool);

async function seed() {
  console.log('Seeding database...');

  // Create default user
  const [user] = await db.insert(users).values({
    email: 'admin@example.com',
    passwordHash: await hashPassword('changeme123'),
  }).returning();

  console.log('Created user:', user.email);

  // Create default settings
  await db.insert(settings).values({
    userId: user.id,
    defaultPaymentDays: 30,
    language: 'de',
  });

  console.log('Created settings');

  console.log('Seed complete!');
  console.log('Login with: admin@example.com / changeme123');
  console.log('Configure your business details in Settings after login.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
