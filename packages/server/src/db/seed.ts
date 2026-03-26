import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from './schema/users.js';
import { settings } from './schema/settings.js';
import { clients } from './schema/clients.js';
import { projects } from './schema/projects.js';
import { invoices } from './schema/invoices.js';
import { hashPassword } from '../utils/password.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://freelancebill:password@localhost:5432/freelancebill',
});

const db = drizzle(pool);

async function seed() {
  console.log('Seeding database...');

  // Create user
  const [user] = await db.insert(users).values({
    email: 'kontakt@milanronnenberg.de',
    passwordHash: await hashPassword('changeme123'),
  }).returning();

  console.log('Created user:', user.email);

  // Create settings
  await db.insert(settings).values({
    userId: user.id,
    fullName: 'Milan Ronnenberg',
    addressStreet: 'Kapellenstr. 19d',
    addressZip: '30625',
    addressCity: 'Hannover',
    email: 'kontakt@milanronnenberg.de',
    phone: '+49 176 56713473',
    iban: 'DE60 2505 0180 1914 7799 91',
    bic: 'SPKHDE2HXXX',
    bankName: 'Sparkasse Hannover',
    taxFreeAllowance: '11784.00',
    defaultPaymentDays: 30,
    defaultHourlyRate: '26.00',
    language: 'de',
  });

  console.log('Created settings');

  // Create client
  const [client] = await db.insert(clients).values({
    userId: user.id,
    name: 'Deutscher Schwimmverband e.V.',
    addressStreet: 'Korbacher Str. 93',
    addressZip: '34132',
    addressCity: 'Kassel',
  }).returning();

  console.log('Created client:', client.name);

  // Create project
  const [project] = await db.insert(projects).values({
    userId: user.id,
    clientId: client.id,
    name: 'Relaunch Landingpage Elterncoaching',
    status: 'active',
    startDate: '2026-03-01',
  }).returning();

  console.log('Created project:', project.name);

  // Create initial invoice
  await db.insert(invoices).values({
    userId: user.id,
    clientId: client.id,
    projectId: project.id,
    invoiceNumber: '2026-001',
    invoiceDate: '2026-03-14',
    paymentDueDate: '2026-04-13',
    paymentDays: 30,
    description: 'Webentwicklung & Design',
    projectSubtitle: 'Relaunch Landingpage Elterncoaching (Projekt des Wasserball Bundesstützpunktes Hannover)',
    billingType: 'hourly',
    hours: '25.00',
    hourlyRate: '26.00',
    totalAmount: '650.00',
    status: 'open',
  });

  console.log('Created invoice: 2026-001');

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
