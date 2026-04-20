import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from './schema/users.js';
import { settings } from './schema/settings.js';
import { clients } from './schema/clients.js';
import { projects } from './schema/projects.js';
import { invoices } from './schema/invoices.js';
import { expenses } from './schema/expenses.js';
import { tags, expenseTags } from './schema/tags.js';
import { documents } from './schema/documents.js';
import { hashPassword } from '../utils/password.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://freelancebill:password@localhost:5432/freelancebill',
});

const db = drizzle(pool);

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const currentYear = new Date().getFullYear();

async function seed() {
  console.log('Seeding database with demo data...');

  // Create default user
  const [user] = await db.insert(users).values({
    email: 'admin@example.com',
    passwordHash: await hashPassword('changeme123'),
  }).returning();

  console.log('Created user:', user.email);

  // Create settings with demo business data
  await db.insert(settings).values({
    userId: user.id,
    fullName: 'Max Mustermann',
    addressStreet: 'Musterstraße 1',
    addressZip: '10115',
    addressCity: 'Berlin',
    email: 'max@mustermann-freelance.de',
    phone: '+49 30 1234567',
    iban: 'DE89 3704 0044 0532 0130 00',
    bic: 'COBADEFFXXX',
    bankName: 'Sparkasse Muster',
    taxFreeAllowance: '12348.00',
    defaultPaymentDays: 30,
    defaultHourlyRate: '85.00',
    language: 'de',
    taxMode: 'kleinunternehmer',
    taxRate: '19.00',
    taxId: '12/345/67890',
    invoiceTemplate: 'standard',
    invoiceAccentColor: '#2563eb',
  });

  console.log('Created settings');

  // Create demo clients
  const [client1] = await db.insert(clients).values({
    userId: user.id,
    name: 'Musterfirma GmbH',
    addressStreet: 'Industriestraße 10',
    addressZip: '80333',
    addressCity: 'München',
    contactPerson: 'Erika Muster',
    email: 'erika@musterfirma.de',
    phone: '+49 89 9876543',
    notes: 'Langjähriger Stammkunde, bevorzugt monatliche Abrechnung.',
  }).returning();

  const [client2] = await db.insert(clients).values({
    userId: user.id,
    name: 'Beispiel AG',
    addressStreet: 'Hauptstraße 5',
    addressZip: '20095',
    addressCity: 'Hamburg',
    contactPerson: 'Thomas Beispiel',
    email: 'thomas@beispiel-ag.de',
    phone: '+49 40 5551234',
    notes: 'Neuer Kunde seit Q1, Fokus auf Webentwicklung.',
  }).returning();

  const [client3] = await db.insert(clients).values({
    userId: user.id,
    name: 'Kreativstudio Muster',
    addressStreet: 'Berliner Allee 22',
    addressZip: '40212',
    addressCity: 'Düsseldorf',
    contactPerson: 'Lisa Kreativ',
    email: 'lisa@kreativstudio-muster.de',
    phone: '+49 211 7778899',
  }).returning();

  const [client4] = await db.insert(clients).values({
    userId: user.id,
    name: 'TechStart UG',
    addressStreet: 'Schillerstraße 8',
    addressZip: '60313',
    addressCity: 'Frankfurt',
    contactPerson: 'Jan Technik',
    email: 'jan@techstart.de',
    phone: '+49 69 4443210',
    notes: 'Startup, schnelle Kommunikation per E-Mail bevorzugt.',
  }).returning();

  console.log('Created 4 demo clients');

  // Create demo projects
  const [project1] = await db.insert(projects).values({
    userId: user.id,
    clientId: client1.id,
    name: 'Webseiten-Redesign',
    status: 'active',
    startDate: daysAgo(60),
    notes: 'Komplettes Redesign der Unternehmenswebseite inkl. responsive Anpassung.',
  }).returning();

  const [project2] = await db.insert(projects).values({
    userId: user.id,
    clientId: client4.id,
    name: 'Mobile App Entwicklung',
    status: 'active',
    startDate: daysAgo(30),
    notes: 'MVP einer nativen App für iOS und Android.',
  }).returning();

  const [project3] = await db.insert(projects).values({
    userId: user.id,
    clientId: client3.id,
    name: 'Corporate Design',
    status: 'completed',
    startDate: daysAgo(120),
    endDate: daysAgo(45),
    notes: 'Logo, Visitenkarten, Briefpapier und Styleguide.',
  }).returning();

  console.log('Created 3 demo projects');

  // Create demo invoices
  const invoiceDate1 = daysAgo(45);
  const [inv1] = await db.insert(invoices).values({
    userId: user.id,
    clientId: client1.id,
    projectId: project1.id,
    invoiceNumber: `${currentYear}-001`,
    invoiceDate: invoiceDate1,
    paymentDueDate: addDays(invoiceDate1, 30),
    paymentDays: 30,
    description: 'Webdesign und Frontend-Entwicklung',
    projectSubtitle: 'Webseiten-Redesign Phase 1',
    billingType: 'hourly',
    hours: '40',
    hourlyRate: '85.00',
    totalAmount: '3400.00',
    status: 'paid',
    paidDate: daysAgo(20),
    serviceDate: invoiceDate1,
  }).returning();

  const invoiceDate2 = daysAgo(15);
  const [inv2] = await db.insert(invoices).values({
    userId: user.id,
    clientId: client2.id,
    invoiceNumber: `${currentYear}-002`,
    invoiceDate: invoiceDate2,
    paymentDueDate: addDays(invoiceDate2, 30),
    paymentDays: 30,
    description: 'Webentwicklung Landing Page',
    billingType: 'fixed',
    fixedAmount: '2500.00',
    totalAmount: '2500.00',
    status: 'open',
    serviceDate: invoiceDate2,
  }).returning();

  const invoiceDate3 = daysAgo(60);
  const [inv3] = await db.insert(invoices).values({
    userId: user.id,
    clientId: client3.id,
    projectId: project3.id,
    invoiceNumber: `${currentYear}-003`,
    invoiceDate: invoiceDate3,
    paymentDueDate: addDays(invoiceDate3, 14),
    paymentDays: 14,
    description: 'Corporate Design Paket',
    projectSubtitle: 'Logo, Visitenkarten & Styleguide',
    billingType: 'fixed',
    fixedAmount: '4200.00',
    totalAmount: '4200.00',
    status: 'paid',
    paidDate: daysAgo(50),
    serviceDate: invoiceDate3,
  }).returning();

  const invoiceDate4 = daysAgo(50);
  const [inv4] = await db.insert(invoices).values({
    userId: user.id,
    clientId: client4.id,
    projectId: project2.id,
    invoiceNumber: `${currentYear}-004`,
    invoiceDate: invoiceDate4,
    paymentDueDate: addDays(invoiceDate4, 30),
    paymentDays: 30,
    description: 'App-Entwicklung Sprint 1',
    projectSubtitle: 'Mobile App MVP',
    billingType: 'hourly',
    hours: '60',
    hourlyRate: '85.00',
    totalAmount: '5100.00',
    status: 'overdue',
    reminderCount: 1,
    lastReminderDate: daysAgo(10),
    serviceDate: invoiceDate4,
  }).returning();

  const invoiceDate5 = daysAgo(5);
  const [inv5] = await db.insert(invoices).values({
    userId: user.id,
    clientId: client1.id,
    projectId: project1.id,
    invoiceNumber: `${currentYear}-005`,
    invoiceDate: invoiceDate5,
    paymentDueDate: addDays(invoiceDate5, 30),
    paymentDays: 30,
    description: 'Webseiten-Redesign Phase 2',
    projectSubtitle: 'Backend & CMS Integration',
    billingType: 'hourly',
    hours: '25',
    hourlyRate: '85.00',
    totalAmount: '2125.00',
    status: 'open',
    serviceDate: invoiceDate5,
  }).returning();

  const invoiceDate6 = daysAgo(90);
  await db.insert(invoices).values({
    userId: user.id,
    clientId: client2.id,
    invoiceNumber: `${currentYear}-006`,
    invoiceDate: invoiceDate6,
    paymentDueDate: addDays(invoiceDate6, 30),
    paymentDays: 30,
    description: 'SEO-Optimierung & Analyse',
    billingType: 'fixed',
    fixedAmount: '1800.00',
    totalAmount: '1800.00',
    status: 'cancelled',
    notes: 'Projekt wurde vom Kunden storniert.',
    serviceDate: invoiceDate6,
  });

  console.log('Created 6 demo invoices');

  // Create demo tags
  const [tagBuero] = await db.insert(tags).values({
    userId: user.id,
    name: 'Büro',
    color: '#3b82f6',
  }).returning();

  const [tagSoftware] = await db.insert(tags).values({
    userId: user.id,
    name: 'Software',
    color: '#8b5cf6',
  }).returning();

  const [tagReise] = await db.insert(tags).values({
    userId: user.id,
    name: 'Reise',
    color: '#10b981',
  }).returning();

  const [tagFortbildung] = await db.insert(tags).values({
    userId: user.id,
    name: 'Fortbildung',
    color: '#f59e0b',
  }).returning();

  const [tagHardware] = await db.insert(tags).values({
    userId: user.id,
    name: 'Hardware',
    color: '#ef4444',
  }).returning();

  console.log('Created 5 demo tags');

  // Create demo expenses
  const [exp1] = await db.insert(expenses).values({
    userId: user.id,
    date: daysAgo(40),
    description: 'Büromaterial (Papier, Stifte, Ordner)',
    amount: '45.90',
    paymentMethod: 'bank_transfer',
    notes: 'Staples Online-Bestellung',
  }).returning();

  const [exp2] = await db.insert(expenses).values({
    userId: user.id,
    date: daysAgo(30),
    description: 'Adobe Creative Cloud Jahresabo',
    amount: '713.88',
    paymentMethod: 'credit_card',
  }).returning();

  const [exp3] = await db.insert(expenses).values({
    userId: user.id,
    date: daysAgo(20),
    description: 'Bahnticket München (Kundentermin)',
    amount: '89.00',
    paymentMethod: 'credit_card',
  }).returning();

  const [exp4] = await db.insert(expenses).values({
    userId: user.id,
    date: daysAgo(10),
    description: 'Online-Kurs: React & TypeScript',
    amount: '49.99',
    paymentMethod: 'paypal',
    notes: 'Udemy Kurs',
  }).returning();

  const [exp5] = await db.insert(expenses).values({
    userId: user.id,
    date: daysAgo(3),
    description: 'Externe SSD 1TB',
    amount: '79.99',
    paymentMethod: 'bank_transfer',
    notes: 'Backup-Festplatte für Projektdaten',
  }).returning();

  console.log('Created 5 demo expenses');

  // Create expense-tag relations
  await db.insert(expenseTags).values({ expenseId: exp1.id, tagId: tagBuero.id });
  await db.insert(expenseTags).values({ expenseId: exp2.id, tagId: tagSoftware.id });
  await db.insert(expenseTags).values({ expenseId: exp3.id, tagId: tagReise.id });
  await db.insert(expenseTags).values({ expenseId: exp4.id, tagId: tagFortbildung.id });
  await db.insert(expenseTags).values({ expenseId: exp5.id, tagId: tagHardware.id });

  console.log('Created expense-tag relations');

  // Create demo documents (archived invoices)
  await db.insert(documents).values({
    userId: user.id,
    invoiceId: inv1.id,
    name: `Rechnung-${currentYear}-001.pdf`,
    type: 'invoice_sent',
    filePath: '/uploads/documents/demo-invoice-001.pdf',
    fileSize: 45000,
    mimeType: 'application/pdf',
  });

  await db.insert(documents).values({
    userId: user.id,
    invoiceId: inv3.id,
    name: `Rechnung-${currentYear}-003.pdf`,
    type: 'invoice_sent',
    filePath: '/uploads/documents/demo-invoice-003.pdf',
    fileSize: 52000,
    mimeType: 'application/pdf',
  });

  console.log('Created 2 demo documents');

  console.log('');
  console.log('=== Seed complete! ===');
  console.log('Login: admin@example.com / changeme123');
  console.log('');
  console.log('Demo data created:');
  console.log('  - 4 clients (Musterfirma, Beispiel AG, Kreativstudio, TechStart)');
  console.log('  - 3 projects (Webseiten-Redesign, Mobile App, Corporate Design)');
  console.log('  - 6 invoices (paid, open, overdue, cancelled)');
  console.log('  - 5 expenses with tags');
  console.log('  - 5 tags (Büro, Software, Reise, Fortbildung, Hardware)');
  console.log('  - 2 archived documents');
  console.log('');
  console.log('Change your password after first login!');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
