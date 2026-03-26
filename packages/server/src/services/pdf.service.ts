import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { hexToRgb, formatEur, formatDate, drawRightAligned, drawWrappedText } from './pdf/helpers.js';
import { TEMPLATE_REGISTRY } from './pdf/registry.js';
import type { PdfTemplateContext } from './pdf/types.js';

export async function generateInvoicePdf(
  invoice: any,
  client: any,
  settings: any,
  options?: { showVatNote?: boolean; taxMode?: string; taxRate?: number; taxId?: string | null; vatId?: string | null },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 60;

  // Resolve accent color from settings (default: #1a1a2e)
  const accentHex = settings.invoiceAccentColor || '#1a1a2e';
  const { r, g, b } = hexToRgb(accentHex);
  const accentColor = rgb(r, g, b);

  const grayColor = rgb(0.533, 0.533, 0.533); // #888888
  const lightGrayBg = rgb(0.961, 0.961, 0.961); // #f5f5f5

  // Build context for the template
  const ctx: PdfTemplateContext = {
    doc,
    page,
    invoice,
    client,
    settings,
    options: options ?? {},
    accentColor,
    grayColor,
    lightGrayBg,
    fonts: { regular, bold },
    margin,
    width,
    height,
  };

  // Look up the template (default: 'standard')
  const templateKey = settings.invoiceTemplate || 'standard';
  const templateFn = TEMPLATE_REGISTRY[templateKey] ?? TEMPLATE_REGISTRY['standard'];

  templateFn(ctx);

  return doc.save();
}

export async function generateReminderPdf(
  invoice: any,
  client: any,
  settings: any,
  reminderLevel: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 60;
  let y = height - margin;

  // Resolve accent color from settings (default: #1a1a2e)
  const accentHex = settings.invoiceAccentColor || '#1a1a2e';
  const { r, g, b } = hexToRgb(accentHex);
  const DARK_BLUE = rgb(r, g, b);
  const GRAY_TEXT = rgb(0.533, 0.533, 0.533); // #888888
  const LIGHT_GRAY_BG = rgb(0.961, 0.961, 0.961); // #f5f5f5
  const WHITE = rgb(1, 1, 1);

  const today = new Date().toISOString().split('T')[0];
  const netAmount =
    typeof invoice.totalAmount === 'number'
      ? invoice.totalAmount
      : parseFloat(invoice.totalAmount || '0');

  // Calculate gross amount for Regelbesteuerung
  const taxMode = settings.taxMode ?? 'kleinunternehmer';
  const taxRate = settings.taxRate ? parseFloat(settings.taxRate) : 19;
  const isRegelbesteuerung = taxMode === 'regelbesteuerung';
  const taxAmount = isRegelbesteuerung ? Math.round(netAmount * taxRate) / 100 : 0;
  const totalAmount = netAmount + taxAmount;

  // Determine title and new payment deadline based on level
  const title = reminderLevel <= 1 ? 'ZAHLUNGSERINNERUNG' : 'MAHNUNG';
  const newDeadlineDays = reminderLevel >= 3 ? 5 : reminderLevel >= 2 ? 7 : 14;
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + newDeadlineDays);
  const newDeadline = deadlineDate.toISOString().split('T')[0];

  // --- HEADER ---
  page.drawText(title, {
    x: margin,
    y: y,
    size: 22,
    font: helveticaBold,
    color: DARK_BLUE,
  });

  // Meta top right
  const metaX = width - margin;
  const metaSize = 9;

  drawRightAligned(
    page,
    `Datum: ${formatDate(today)}`,
    metaX,
    y + 4,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
    page,
    `Bezug: Rechnung Nr. ${invoice.invoiceNumber}`,
    metaX,
    y - 10,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
    page,
    `Mahnstufe: ${reminderLevel}`,
    metaX,
    y - 24,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );

  y -= 50;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: GRAY_TEXT,
  });

  y -= 30;

  // --- Small sender line above recipient ---
  const senderLine = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''}`;
  page.drawText(senderLine, {
    x: margin,
    y: y,
    size: 7,
    font: helvetica,
    color: GRAY_TEXT,
  });

  y -= 20;

  // --- ADDRESSES ---
  // Recipient (left)
  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity
      ? `${client.addressZip} ${client.addressCity}`
      : client?.addressCity,
  ].filter(Boolean);

  for (const line of recipientLines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: DARK_BLUE,
    });
    y -= 14;
  }

  // Sender details (right column)
  const senderX = width - margin - 180;
  let senderY = y + recipientLines.length * 14;
  const senderDetails = [
    settings.fullName,
    settings.addressStreet,
    settings.addressZip && settings.addressCity
      ? `${settings.addressZip} ${settings.addressCity}`
      : settings.addressCity,
    '',
    settings.email,
    settings.phone,
  ].filter((line) => line !== undefined);

  for (const line of senderDetails) {
    if (line === '') {
      senderY -= 8;
      continue;
    }
    page.drawText(line, {
      x: senderX,
      y: senderY,
      size: 9,
      font: helvetica,
      color: GRAY_TEXT,
    });
    senderY -= 13;
  }

  y -= 40;

  // --- SUBJECT ---
  page.drawText(`${title} — Rechnung Nr. ${invoice.invoiceNumber}`, {
    x: margin,
    y,
    size: 11,
    font: helveticaBold,
    color: DARK_BLUE,
  });
  y -= 25;

  // --- BODY TEXT ---
  const maxTextWidth = width - 2 * margin;
  let bodyText = '';

  if (reminderLevel <= 1) {
    bodyText = `Sehr geehrte Damen und Herren,\n\nwir möchten Sie freundlich daran erinnern, dass die Rechnung Nr. ${invoice.invoiceNumber} vom ${formatDate(invoice.invoiceDate)} mit einem Betrag von ${formatEur(totalAmount)} am ${formatDate(invoice.paymentDueDate)} fällig war und bisher noch nicht beglichen wurde.\n\nBitte überweisen Sie den ausstehenden Betrag bis zum ${formatDate(newDeadline)} auf das unten genannte Konto.\n\nSollte sich Ihre Zahlung mit diesem Schreiben gekreuzt haben, betrachten Sie es bitte als gegenstandslos.`;
  } else if (reminderLevel === 2) {
    const lastReminderDateStr = invoice.lastReminderDate ? formatDate(invoice.lastReminderDate) : formatDate(today);
    bodyText = `Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung vom ${lastReminderDateStr} ist die oben genannte Rechnung Nr. ${invoice.invoiceNumber} vom ${formatDate(invoice.invoiceDate)} über ${formatEur(totalAmount)} weiterhin offen.\n\nWir bitten Sie dringend, den ausstehenden Betrag innerhalb von 7 Tagen, bis zum ${formatDate(newDeadline)}, auf das unten genannte Konto zu überweisen.`;
  } else {
    const lastReminderDateStr = invoice.lastReminderDate ? formatDate(invoice.lastReminderDate) : formatDate(today);
    bodyText = `Sehr geehrte Damen und Herren,\n\nLetzte Mahnung. Trotz unserer bisherigen Mahnungen vom ${lastReminderDateStr} ist die Rechnung Nr. ${invoice.invoiceNumber} vom ${formatDate(invoice.invoiceDate)} über ${formatEur(totalAmount)} weiterhin nicht beglichen.\n\nSollte der Betrag nicht innerhalb von 5 Tagen, bis zum ${formatDate(newDeadline)}, auf dem unten genannten Konto eingehen, behalten wir uns weitere rechtliche Schritte vor.`;
  }

  // Draw body text paragraph by paragraph
  const paragraphs = bodyText.split('\n\n');
  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n');
    for (const line of lines) {
      y = drawWrappedText(page, line, margin, y, maxTextWidth, helvetica, 9, DARK_BLUE, 14);
    }
    y -= 6; // extra space between paragraphs
  }

  y -= 20;

  // --- INVOICE REFERENCE TABLE ---
  const tableX = margin;
  const colWidths = [300, 175];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerHeight = 28;
  const rowHeight = 32;

  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: DARK_BLUE,
  });

  page.drawText('Beschreibung', {
    x: tableX + 8,
    y: y - headerHeight + 9,
    size: 9,
    font: helveticaBold,
    color: WHITE,
  });
  drawRightAligned(page, 'Betrag', tableX + tableWidth - 8, y - headerHeight + 9, helveticaBold, 9, WHITE);

  y -= headerHeight;

  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: LIGHT_GRAY_BG,
  });

  page.drawText(invoice.description || '', {
    x: tableX + 8,
    y: y - rowHeight + 10,
    size: 9,
    font: helvetica,
    color: DARK_BLUE,
  });
  drawRightAligned(
    page,
    formatEur(totalAmount),
    tableX + tableWidth - 8,
    y - rowHeight + 10,
    helvetica,
    9,
    DARK_BLUE,
  );

  y -= rowHeight;
  y -= 15;

  // Gesamtbetrag
  const totalsX = tableX + tableWidth - 200;
  page.drawText('Offener Betrag:', {
    x: totalsX,
    y,
    size: 10,
    font: helveticaBold,
    color: DARK_BLUE,
  });
  drawRightAligned(
    page,
    formatEur(totalAmount),
    tableX + tableWidth,
    y,
    helveticaBold,
    10,
    DARK_BLUE,
  );

  y -= 15;
  page.drawLine({
    start: { x: totalsX, y: y + 5 },
    end: { x: tableX + tableWidth, y: y + 5 },
    thickness: 0.5,
    color: GRAY_TEXT,
  });

  y -= 20;

  // --- NEW PAYMENT DEADLINE ---
  page.drawText(`Neues Zahlungsziel: ${formatDate(newDeadline)}`, {
    x: margin,
    y,
    size: 10,
    font: helveticaBold,
    color: DARK_BLUE,
  });

  y -= 30;

  // --- BANK DETAILS ---
  page.drawText('Bankverbindung', {
    x: margin,
    y,
    size: 10,
    font: helveticaBold,
    color: DARK_BLUE,
  });
  y -= 18;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: GRAY_TEXT,
    });
    page.drawText(value, {
      x: margin + 90,
      y,
      size: 9,
      font: helvetica,
      color: DARK_BLUE,
    });
    y -= 14;
  }

  y -= 15;

  // --- PAYMENT INSTRUCTION ---
  page.drawText(
    `Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: margin, y, size: 9, font: helvetica, color: DARK_BLUE },
  );

  // --- FOOTER ---
  const footerY = 40;
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: width - margin, y: footerY + 10 },
    thickness: 0.5,
    color: GRAY_TEXT,
  });

  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, {
    x: margin,
    y: footerY - 5,
    size: 7,
    font: helvetica,
    color: GRAY_TEXT,
  });

  return doc.save();
}
