import { rgb, StandardFonts } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const BLACK = rgb(0, 0, 0);
const HAIRLINE_GRAY = rgb(0.82, 0.82, 0.82);
const BODY_GRAY = rgb(0.30, 0.30, 0.30);
const LABEL_GRAY = rgb(0.55, 0.55, 0.55);

/**
 * Modern Minimal — Maximum whitespace, hairline separators, elegant restraint.
 * Accent color only on invoice number and Gesamtbetrag value.
 */
export async function renderModernMinimal(ctx: PdfTemplateContext): Promise<void> {
  const { doc, page, invoice, client, settings, options, accentColor, fonts, width, height } = ctx;
  const { regular: helvetica, bold: helveticaBold } = fonts;

  // Embed Courier for invoice number
  const courier = await doc.embedFont(StandardFonts.Courier);

  const margin = 80; // wider margins for whitespace
  let y = height - margin;

  // --- HEADER ---
  page.drawText('RECHNUNG', {
    x: margin,
    y,
    size: 18,
    font: helvetica,
    color: accentColor,
  });

  y -= 28;

  // Invoice number in Courier, accent color
  page.drawText(invoice.invoiceNumber, {
    x: margin,
    y,
    size: 11,
    font: courier,
    color: accentColor,
  });

  y -= 30;

  // Hairline separator
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.25,
    color: HAIRLINE_GRAY,
  });

  y -= 28;

  // --- META (date, due date, service date) left-aligned, compact ---
  const metaSize = 8.5;
  const metaLineH = 14;

  page.drawText(`Rechnungsdatum: ${formatDate(invoice.invoiceDate)}`, {
    x: margin, y, size: metaSize, font: helvetica, color: LABEL_GRAY,
  });
  y -= metaLineH;

  page.drawText(`Zahlungsziel: ${formatDate(invoice.paymentDueDate)}`, {
    x: margin, y, size: metaSize, font: helvetica, color: LABEL_GRAY,
  });
  y -= metaLineH;

  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    page.drawText(`Leistungszeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`, {
      x: margin, y, size: metaSize, font: helvetica, color: LABEL_GRAY,
    });
    y -= metaLineH;
  } else if (invoice.serviceDate) {
    page.drawText(`Leistungsdatum: ${formatDate(invoice.serviceDate)}`, {
      x: margin, y, size: metaSize, font: helvetica, color: LABEL_GRAY,
    });
    y -= metaLineH;
  }

  y -= 20;

  // --- ADDRESSES: stacked vertically (sender above, gap, recipient below) ---
  // Sender
  const senderParts = [
    settings.fullName,
    settings.addressStreet,
    settings.addressZip && settings.addressCity
      ? `${settings.addressZip} ${settings.addressCity}`
      : settings.addressCity,
    settings.email,
    settings.phone,
  ].filter(Boolean);

  for (const line of senderParts) {
    page.drawText(line, { x: margin, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
    y -= 13;
  }

  y -= 16;

  // Recipient
  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity
      ? `${client.addressZip} ${client.addressCity}`
      : client?.addressCity,
  ].filter(Boolean);

  for (const line of recipientLines) {
    page.drawText(line, { x: margin, y, size: 9, font: helvetica, color: BODY_GRAY });
    y -= 14;
  }

  y -= 25;

  // --- DESCRIPTION ---
  if (invoice.description) {
    page.drawText(invoice.description, { x: margin, y, size: 9, font: helveticaBold, color: BODY_GRAY });
    y -= 14;
  }
  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
    y -= 14;
  }

  y -= 20;

  // --- TABLE (no backgrounds, only bottom hairlines) ---
  const contentWidth = width - 2 * margin;
  const colDesc = contentWidth * 0.48;
  const colHours = contentWidth * 0.15;
  const colRate = contentWidth * 0.18;
  const colTotal = contentWidth * 0.19;
  const tableRight = width - margin;

  // Header row
  const headerY = y;
  page.drawText('Beschreibung', { x: margin, y: headerY, size: 8, font: helveticaBold, color: LABEL_GRAY });
  drawRightAligned(page, 'Stunden', margin + colDesc + colHours, headerY, helveticaBold, 8, LABEL_GRAY);
  drawRightAligned(page, 'Einzelpreis', margin + colDesc + colHours + colRate, headerY, helveticaBold, 8, LABEL_GRAY);
  drawRightAligned(page, 'Gesamt', tableRight, headerY, helveticaBold, 8, LABEL_GRAY);

  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: tableRight, y },
    thickness: 0.25,
    color: HAIRLINE_GRAY,
  });

  y -= 16;

  // Data row
  const totalAmount = toNum(invoice.totalAmount);

  page.drawText(invoice.description || '', { x: margin, y, size: 8.5, font: helvetica, color: BODY_GRAY });

  if (invoice.billingType === 'hourly') {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), margin + colDesc + colHours, y, helvetica, 8.5, BODY_GRAY);
    drawRightAligned(page, formatEur(hourlyRate), margin + colDesc + colHours + colRate, y, helvetica, 8.5, BODY_GRAY);
  }

  drawRightAligned(page, formatEur(totalAmount), tableRight, y, helvetica, 8.5, BODY_GRAY);

  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: tableRight, y },
    thickness: 0.25,
    color: HAIRLINE_GRAY,
  });

  y -= 25;

  // --- TAX ---
  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  // Totals right-aligned
  const totalsLabelX = tableRight - 180;

  page.drawText('Nettobetrag:', { x: totalsLabelX, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(netAmount), tableRight, y, helvetica, 8.5, BODY_GRAY);
  y -= 14;

  const ustLabel = isRegelbesteuerung ? `Umsatzsteuer (${taxRate.toFixed(0)}%):` : 'Umsatzsteuer:';
  page.drawText(ustLabel, { x: totalsLabelX, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(taxAmount), tableRight, y, helvetica, 8.5, BODY_GRAY);
  y -= 4;

  page.drawLine({
    start: { x: totalsLabelX, y },
    end: { x: tableRight, y },
    thickness: 0.25,
    color: HAIRLINE_GRAY,
  });
  y -= 14;

  // Gesamtbetrag — accent color on value
  page.drawText('Gesamtbetrag:', { x: totalsLabelX, y, size: 9, font: helveticaBold, color: BODY_GRAY });
  drawRightAligned(page, formatEur(grossAmount), tableRight, y, helveticaBold, 9, accentColor);

  // Tax notes left side
  let noteY = y + 14;
  if (!isRegelbesteuerung) {
    if (options.showVatNote !== false) {
      page.drawText('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', {
        x: margin, y: noteY, size: 7.5, font: helvetica, color: LABEL_GRAY,
      });
      noteY -= 11;
    }
  }
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, { x: margin, y: noteY, size: 7.5, font: helvetica, color: LABEL_GRAY });
    noteY -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: margin, y: noteY, size: 7.5, font: helvetica, color: LABEL_GRAY });
    noteY -= 11;
  }

  y -= 45;

  // --- BANK DETAILS ---
  page.drawText('Bankverbindung', { x: margin, y, size: 8.5, font: helveticaBold, color: BODY_GRAY });
  y -= 16;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: margin, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
    page.drawText(value, { x: margin + 85, y, size: 8.5, font: helvetica, color: BODY_GRAY });
    y -= 13;
  }

  y -= 16;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen.`,
    { x: margin, y, size: 8.5, font: helvetica, color: BODY_GRAY },
  );
  y -= 13;
  page.drawText(
    `Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: margin, y, size: 8.5, font: helvetica, color: BODY_GRAY },
  );

  // --- FOOTER: minimal ---
  const footerY = 36;
  page.drawLine({
    start: { x: margin, y: footerY + 8 },
    end: { x: width - margin, y: footerY + 8 },
    thickness: 0.25,
    color: HAIRLINE_GRAY,
  });

  const footerText = `${settings.fullName || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY - 4, size: 7, font: helvetica, color: LABEL_GRAY });
}
