import { db } from '../db/index.js';
import { settings, clients, projects, invoices, expenses, tags, expenseTags, documents } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';

export async function exportBackup(userId: string): Promise<Buffer> {
  // Query all tables
  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
  const allClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allProjects = await db.select().from(projects).where(eq(projects.userId, userId));
  const allInvoices = await db.select().from(invoices).where(eq(invoices.userId, userId));
  const allExpenses = await db.select().from(expenses).where(eq(expenses.userId, userId));
  const allTags = await db.select().from(tags).where(eq(tags.userId, userId));
  const allDocuments = await db.select().from(documents).where(eq(documents.userId, userId));

  // Get expense-tag relations for all user expenses
  const allExpenseTags = [];
  for (const expense of allExpenses) {
    const ets = await db.select().from(expenseTags).where(eq(expenseTags.expenseId, expense.id));
    allExpenseTags.push(...ets);
  }

  const date = new Date().toISOString().split('T')[0];
  const folderName = `freelancebill-backup-${date}`;

  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    data: {
      settings: userSettings || null,
      clients: allClients,
      projects: allProjects,
      invoices: allInvoices,
      expenses: allExpenses,
      tags: allTags,
      expenseTags: allExpenseTags,
      documents: allDocuments,
    },
  };

  // Count files for manifest
  let documentFileCount = 0;
  let receiptFileCount = 0;

  // Create ZIP
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    archive.on('error', (err: Error) => reject(err));

    // Add data.json
    archive.append(JSON.stringify(data, null, 2), { name: `${folderName}/data.json` });

    // Add document files
    const addFiles = async () => {
      for (const doc of allDocuments) {
        if (doc.filePath) {
          const absolutePath = join(process.cwd(), doc.filePath.replace(/^\//, ''));
          if (existsSync(absolutePath)) {
            const fileBuffer = await readFile(absolutePath);
            const filename = doc.filePath.split('/').pop() || doc.name;
            archive.append(fileBuffer, { name: `${folderName}/uploads/documents/${filename}` });
            documentFileCount++;
          }
        }
      }

      // Add receipt files
      for (const expense of allExpenses) {
        if (expense.receiptPath) {
          const absolutePath = join(process.cwd(), expense.receiptPath.replace(/^\//, ''));
          if (existsSync(absolutePath)) {
            const fileBuffer = await readFile(absolutePath);
            const filename = expense.receiptPath.split('/').pop() || `receipt-${expense.id}`;
            archive.append(fileBuffer, { name: `${folderName}/uploads/receipts/${filename}` });
            receiptFileCount++;
          }
        }
      }

      // Add manifest
      const manifest = {
        version: '2.0',
        createdAt: new Date().toISOString(),
        folderName,
        fileCounts: {
          documents: documentFileCount,
          receipts: receiptFileCount,
        },
        dataCounts: {
          clients: allClients.length,
          projects: allProjects.length,
          invoices: allInvoices.length,
          expenses: allExpenses.length,
          tags: allTags.length,
          expenseTags: allExpenseTags.length,
          documents: allDocuments.length,
        },
      };
      archive.append(JSON.stringify(manifest, null, 2), { name: `${folderName}/manifest.json` });

      archive.finalize();
    };

    addFiles().catch(reject);
  });
}

// Field allowlists for restore — only these fields are inserted
const SETTINGS_FIELDS = ['fullName', 'addressStreet', 'addressZip', 'addressCity', 'email', 'phone', 'iban', 'bic', 'bankName', 'taxFreeAllowance', 'defaultPaymentDays', 'defaultHourlyRate', 'language', 'taxMode', 'taxRate', 'taxId', 'vatId', 'invoiceTemplate', 'invoiceAccentColor'];
const CLIENT_FIELDS = ['id', 'name', 'addressStreet', 'addressZip', 'addressCity', 'contactPerson', 'email', 'phone', 'notes', 'createdAt', 'updatedAt'];
const PROJECT_FIELDS = ['id', 'clientId', 'name', 'status', 'startDate', 'endDate', 'notes', 'createdAt', 'updatedAt'];
const INVOICE_FIELDS = ['id', 'clientId', 'projectId', 'invoiceNumber', 'invoiceDate', 'paymentDueDate', 'paymentDays', 'description', 'projectSubtitle', 'billingType', 'hours', 'hourlyRate', 'fixedAmount', 'totalAmount', 'status', 'paidDate', 'isRecurring', 'recurringInterval', 'recurringNextDate', 'notes', 'reminderCount', 'lastReminderDate', 'serviceDate', 'servicePeriodStart', 'servicePeriodEnd', 'createdAt', 'updatedAt'];
const EXPENSE_FIELDS = ['id', 'date', 'description', 'amount', 'paymentMethod', 'receiptPath', 'notes', 'createdAt', 'updatedAt'];
const TAG_FIELDS = ['id', 'name', 'color', 'createdAt'];
const DOCUMENT_FIELDS = ['id', 'invoiceId', 'name', 'type', 'filePath', 'fileSize', 'mimeType', 'uploadedAt'];

function pickFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in obj) result[field] = obj[field];
  }
  return result;
}

const MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024; // 500MB max uncompressed

export async function importBackup(userId: string, zipBuffer: Buffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // ZIP bomb protection: check total uncompressed size
  let totalUncompressedSize = 0;
  for (const entry of entries) {
    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      throw new Error('Backup too large: uncompressed size exceeds 500MB limit');
    }
  }

  // Find data.json (could be in a subfolder)
  const dataEntry = entries.find((e) => e.entryName.endsWith('/data.json') || e.entryName === 'data.json');
  if (!dataEntry) {
    throw new Error('Invalid backup: data.json not found');
  }

  const backup = JSON.parse(dataEntry.getData().toString('utf-8'));
  if (!backup?.data) {
    throw new Error('Invalid backup format');
  }

  const { data } = backup;

  const counts = await db.transaction(async (tx) => {
    // Delete existing data in reverse dependency order
    const userExpenses = await tx.select({ id: expenses.id }).from(expenses).where(eq(expenses.userId, userId));
    for (const expense of userExpenses) {
      await tx.delete(expenseTags).where(eq(expenseTags.expenseId, expense.id));
    }

    await tx.delete(expenses).where(eq(expenses.userId, userId));
    await tx.delete(documents).where(eq(documents.userId, userId));
    await tx.delete(invoices).where(eq(invoices.userId, userId));
    await tx.delete(projects).where(eq(projects.userId, userId));
    await tx.delete(clients).where(eq(clients.userId, userId));
    await tx.delete(tags).where(eq(tags.userId, userId));
    await tx.delete(settings).where(eq(settings.userId, userId));

    const result = {
      settings: 0,
      clients: 0,
      projects: 0,
      invoices: 0,
      expenses: 0,
      tags: 0,
      expenseTags: 0,
      documents: 0,
      files: 0,
    };

    // Settings — use field allowlist to prevent arbitrary data injection
    if (data.settings) {
      await tx.insert(settings).values({ ...pickFields(data.settings, SETTINGS_FIELDS), userId } as any);
      result.settings = 1;
    }

    // Clients
    if (data.clients?.length) {
      for (const client of data.clients) {
        await tx.insert(clients).values({ ...pickFields(client, CLIENT_FIELDS), userId } as any);
      }
      result.clients = data.clients.length;
    }

    // Projects
    if (data.projects?.length) {
      for (const project of data.projects) {
        await tx.insert(projects).values({ ...pickFields(project, PROJECT_FIELDS), userId } as any);
      }
      result.projects = data.projects.length;
    }

    // Invoices
    if (data.invoices?.length) {
      for (const invoice of data.invoices) {
        await tx.insert(invoices).values({ ...pickFields(invoice, INVOICE_FIELDS), userId } as any);
      }
      result.invoices = data.invoices.length;
    }

    // Expenses
    if (data.expenses?.length) {
      for (const expense of data.expenses) {
        await tx.insert(expenses).values({ ...pickFields(expense, EXPENSE_FIELDS), userId } as any);
      }
      result.expenses = data.expenses.length;
    }

    // Tags
    if (data.tags?.length) {
      for (const tag of data.tags) {
        await tx.insert(tags).values({ ...pickFields(tag, TAG_FIELDS), userId } as any);
      }
      result.tags = data.tags.length;
    }

    // Expense-tag relations — validate IDs belong to restored data
    if (data.expenseTags?.length) {
      const restoredExpenseIds = new Set((data.expenses || []).map((e: any) => e.id));
      const restoredTagIds = new Set((data.tags || []).map((t: any) => t.id));
      for (const et of data.expenseTags) {
        if (!restoredExpenseIds.has(et.expenseId) || !restoredTagIds.has(et.tagId)) {
          continue; // Skip orphaned relations
        }
        await tx.insert(expenseTags).values({
          id: et.id,
          expenseId: et.expenseId,
          tagId: et.tagId,
        });
      }
      result.expenseTags = data.expenseTags.length;
    }

    // Documents
    if (data.documents?.length) {
      for (const doc of data.documents) {
        await tx.insert(documents).values({ ...pickFields(doc, DOCUMENT_FIELDS), userId } as any);
      }
      result.documents = data.documents.length;
    }

    return result;
  });

  // Extract upload files from ZIP to disk
  let filesRestored = 0;
  for (const entry of entries) {
    const name = entry.entryName;
    // Match uploads/documents/* or uploads/receipts/*
    const uploadsMatch = name.match(/uploads\/(documents|receipts)\/(.+)$/);
    if (uploadsMatch && !entry.isDirectory) {
      const subDir = uploadsMatch[1]; // 'documents' or 'receipts'
      // Sanitize filename to prevent path traversal attacks
      const filename = basename(uploadsMatch[2]);
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        continue; // Skip malicious filenames
      }
      const targetDir = resolve(process.cwd(), 'uploads', subDir);
      await mkdir(targetDir, { recursive: true });
      const targetPath = resolve(targetDir, filename);
      // Verify the resolved path is still within the uploads directory
      if (!targetPath.startsWith(targetDir)) {
        continue; // Skip path traversal attempts
      }
      await writeFile(targetPath, entry.getData());
      filesRestored++;
    }
  }

  return { ...counts, files: filesRestored };
}
