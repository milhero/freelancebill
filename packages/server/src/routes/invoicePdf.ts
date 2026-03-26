import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { getInvoice } from '../services/invoice.service.js';
import { generateInvoicePdf, generateReminderPdf } from '../services/pdf.service.js';
import { db } from '../db/index.js';
import { clients } from '../db/schema/clients.js';
import { invoices } from '../db/schema/invoices.js';
import { settings } from '../db/schema/settings.js';
import { eq, and, sql } from 'drizzle-orm';

export async function invoicePdfRoutes(app: FastifyInstance) {
  // POST /api/invoices/preview-pdf — Generate a preview PDF from raw form data
  app.post(
    '/api/invoices/preview-pdf',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = request.body as {
        invoiceNumber: string;
        invoiceDate: string;
        paymentDueDate: string;
        description: string;
        projectSubtitle?: string;
        billingType: 'hourly' | 'fixed';
        hours?: number;
        hourlyRate?: number;
        fixedAmount?: number;
        totalAmount: number;
        notes?: string;
        clientName: string;
        clientStreet?: string;
        clientZip?: string;
        clientCity?: string;
        senderName: string;
        senderStreet: string;
        senderZip: string;
        senderCity: string;
        senderEmail: string;
        senderPhone: string;
        senderIban: string;
        senderBic: string;
        senderBank: string;
        showVatNote?: boolean;
        paymentDays?: number;
        taxMode?: string;
        taxRate?: number;
        taxId?: string | null;
        vatId?: string | null;
        serviceDate?: string;
        servicePeriodStart?: string;
        servicePeriodEnd?: string;
      };

      // Construct mock objects matching what generateInvoicePdf expects
      const invoice = {
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate,
        paymentDueDate: body.paymentDueDate,
        description: body.description,
        projectSubtitle: body.projectSubtitle,
        billingType: body.billingType,
        hours: body.hours,
        hourlyRate: body.hourlyRate,
        fixedAmount: body.fixedAmount,
        totalAmount: body.totalAmount,
        notes: body.notes,
        paymentDays: body.paymentDays ?? 14,
        serviceDate: body.serviceDate || null,
        servicePeriodStart: body.servicePeriodStart || null,
        servicePeriodEnd: body.servicePeriodEnd || null,
      };

      const client = {
        name: body.clientName,
        addressStreet: body.clientStreet,
        addressZip: body.clientZip,
        addressCity: body.clientCity,
      };

      const settingsData = {
        fullName: body.senderName,
        addressStreet: body.senderStreet,
        addressZip: body.senderZip,
        addressCity: body.senderCity,
        email: body.senderEmail,
        phone: body.senderPhone,
        iban: body.senderIban,
        bic: body.senderBic,
        bankName: body.senderBank,
      };

      const showVatNote = body.showVatNote !== false;
      const pdfBytes = await generateInvoicePdf(invoice, client, settingsData, {
        showVatNote,
        taxMode: body.taxMode,
        taxRate: body.taxRate,
        taxId: body.taxId,
        vatId: body.vatId,
      });

      const { download } = request.query as { download?: string };

      reply.header('Content-Type', 'application/pdf');
      if (download === 'true') {
        reply.header(
          'Content-Disposition',
          `attachment; filename="Rechnung-${invoice.invoiceNumber}.pdf"`,
        );
      } else {
        reply.header('Content-Disposition', 'inline; filename="Vorschau.pdf"');
      }
      return reply.send(Buffer.from(pdfBytes));
    },
  );

  // GET /api/invoices/:id/pdf
  app.get(
    '/api/invoices/:id/pdf',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { download } = request.query as { download?: string };
      const userId = (request as any).userId;

      // Get the invoice
      const invoice = await getInvoice(userId, id);

      // Get client data
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      // Get user settings
      const [userSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.userId, userId))
        .limit(1);

      const settingsData = userSettings || {};

      // Generate the PDF with tax settings
      const pdfBytes = await generateInvoicePdf(invoice, client, settingsData, {
        taxMode: userSettings?.taxMode ?? 'kleinunternehmer',
        taxRate: userSettings?.taxRate ? parseFloat(userSettings.taxRate) : 19,
        taxId: userSettings?.taxId ?? null,
        vatId: userSettings?.vatId ?? null,
      });

      reply.header('Content-Type', 'application/pdf');

      if (download === 'true') {
        reply.header(
          'Content-Disposition',
          `attachment; filename="Rechnung-${invoice.invoiceNumber}.pdf"`,
        );
      } else {
        reply.header(
          'Content-Disposition',
          `inline; filename="Rechnung-${invoice.invoiceNumber}.pdf"`,
        );
      }

      return reply.send(Buffer.from(pdfBytes));
    },
  );

  // POST /api/invoices/:id/reminder — Generate reminder PDF and increment counter
  app.post(
    '/api/invoices/:id/reminder',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;

      // Get the invoice
      const invoice = await getInvoice(userId, id);

      // Verify the invoice is overdue
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = invoice.status === 'open' && invoice.paymentDueDate < today;
      if (!isOverdue) {
        return reply.code(400).send({ error: 'Invoice is not overdue' });
      }

      // Increment reminder count and set last reminder date
      const newReminderCount = (invoice.reminderCount ?? 0) + 1;

      await db
        .update(invoices)
        .set({
          reminderCount: newReminderCount,
          lastReminderDate: today,
        })
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

      // Get client data
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      // Get user settings
      const [userSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.userId, userId))
        .limit(1);

      const settingsData = userSettings || {};

      // Generate the reminder PDF
      const pdfBytes = await generateReminderPdf(invoice, client, settingsData, newReminderCount);

      const levelLabel = newReminderCount <= 1 ? 'Zahlungserinnerung' : `Mahnung-${newReminderCount}`;

      reply.header('Content-Type', 'application/pdf');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${levelLabel}-${invoice.invoiceNumber}.pdf"`,
      );
      return reply.send(Buffer.from(pdfBytes));
    },
  );
}
