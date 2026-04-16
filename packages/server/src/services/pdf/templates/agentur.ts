import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

/**
 * Template "Agentur" — Two-column layout with full-height accent sidebar.
 * Sidebar holds sender info + bank details; main area holds invoice content.
 */
export function renderAgentur(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, grayColor, fonts, width, height } = ctx;
  const { regular, bold } = fonts;

  // --- SIDEBAR ---
  const sidebarW = 130;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: sidebarW,
    height,
    color: accentColor,
  });

  // Sidebar content — sender info (top)
  let sy = height - 50;
  const sx = 16;
  const sideMaxW = sidebarW - 32;

  page.drawText(settings.fullName || '', { x: sx, y: sy, size: 12, font: bold, color: WHITE });
  sy -= 18;

  const senderLines = [
    settings.addressStreet,
    settings.addressZip && settings.addressCity ? `${settings.addressZip} ${settings.addressCity}` : settings.addressCity,
    '',
    settings.email,
    settings.phone,
  ].filter((l) => l !== undefined);

  for (const line of senderLines) {
    if (line === '') { sy -= 8; continue; }
    page.drawText(line, { x: sx, y: sy, size: 8, font: regular, color: WHITE });
    sy -= 12;
  }

  // Tax IDs in sidebar
  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  sy -= 10;
  if (taxId) {
    page.drawText(`St.-Nr.: ${taxId}`, { x: sx, y: sy, size: 7, font: regular, color: WHITE });
    sy -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: sx, y: sy, size: 7, font: regular, color: WHITE });
    sy -= 11;
  }

  // Sidebar content — bank details (lower)
  sy = 200;
  page.drawText('Bankverbindung', { x: sx, y: sy, size: 9, font: bold, color: WHITE });
  sy -= 14;

  const bankLines: [string, string][] = [
    ['Inhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankLines) {
    page.drawText(label, { x: sx, y: sy, size: 7, font: regular, color: WHITE });
    sy -= 10;
    page.drawText(value, { x: sx, y: sy, size: 7, font: bold, color: WHITE });
    sy -= 14;
  }

  // --- MAIN AREA ---
  const mainX = 150;
  const mainRight = width - 50;
  const mainW = mainRight - mainX;
  let y = height - 60;

  // "RECHNUNG" title
  page.drawText('RECHNUNG', { x: mainX, y, size: 20, font: bold, color: accentColor });
  y -= 28;

  // Invoice meta
  const metaSize = 9;
  const metaLines = [
    `Rechnungsnr.: ${invoice.invoiceNumber}`,
    `Rechnungsdatum: ${formatDate(invoice.invoiceDate)}`,
    `Zahlungsziel: ${formatDate(invoice.paymentDueDate)}`,
  ];

  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    metaLines.push(`Leistungszeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`);
  } else if (invoice.serviceDate) {
    metaLines.push(`Leistungsdatum: ${formatDate(invoice.serviceDate)}`);
  }

  for (const ml of metaLines) {
    page.drawText(ml, { x: mainX, y, size: metaSize, font: regular, color: grayColor });
    y -= 14;
  }

  y -= 16;

  // Recipient address
  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity ? `${client.addressZip} ${client.addressCity}` : client?.addressCity,
  ].filter(Boolean);

  for (const line of recipientLines) {
    page.drawText(line, { x: mainX, y, size: 10, font: regular, color: BLACK });
    y -= 14;
  }

  y -= 30;

  // Subject
  page.drawText(invoice.description || '', { x: mainX, y, size: 11, font: bold, color: BLACK });
  y -= 16;
  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: mainX, y, size: 9, font: regular, color: grayColor });
    y -= 14;
  }
  y -= 20;

  // --- TABLE ---
  const isHourly = invoice.billingType === 'hourly';
  const colWidths = isHourly ? [160, 55, 75, 75] : [290, 75];
  const headers = isHourly
    ? ['Beschreibung', 'Stunden', 'Einzelpreis', 'Gesamt']
    : ['Beschreibung', 'Gesamt'];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerHeight = 24;

  // Header — accent text, bottom border only
  let colX = mainX;
  for (let i = 0; i < headers.length; i++) {
    if (i === 0) {
      page.drawText(headers[i], { x: colX + 4, y: y - headerHeight + 8, size: 9, font: bold, color: accentColor });
    } else {
      drawRightAligned(page, headers[i], colX + colWidths[i] - 4, y - headerHeight + 8, bold, 9, accentColor);
    }
    colX += colWidths[i];
  }
  y -= headerHeight;

  // Header bottom border
  page.drawLine({ start: { x: mainX, y }, end: { x: mainX + tableWidth, y }, thickness: 1, color: accentColor });
  y -= 4;

  // Data row
  const rowHeight = 28;
  const rowY = y - rowHeight + 10;

  const totalAmount = toNum(invoice.totalAmount);

  page.drawText(invoice.description || '', { x: mainX + 4, y: rowY, size: 9, font: regular, color: BLACK });

  if (isHourly) {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    let cx = mainX + colWidths[0];
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), cx + colWidths[1] - 4, rowY, regular, 9, BLACK);
    cx += colWidths[1];
    drawRightAligned(page, formatEur(hourlyRate), cx + colWidths[2] - 4, rowY, regular, 9, BLACK);
    cx += colWidths[2];
    drawRightAligned(page, formatEur(totalAmount), cx + colWidths[3] - 4, rowY, regular, 9, BLACK);
  } else {
    drawRightAligned(page, formatEur(totalAmount), mainX + tableWidth - 4, rowY, regular, 9, BLACK);
  }

  y -= rowHeight;

  // Row bottom border
  page.drawLine({ start: { x: mainX, y }, end: { x: mainX + tableWidth, y }, thickness: 0.5, color: grayColor });

  y -= 25;

  // --- TAX CALCULATION ---
  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  // Totals
  const totalsX = mainX + tableWidth - 180;

  page.drawText('Nettobetrag:', { x: totalsX, y, size: 9, font: regular, color: grayColor });
  drawRightAligned(page, formatEur(netAmount), mainX + tableWidth, y, regular, 9, BLACK);
  y -= 16;

  const ustLabel = isRegelbesteuerung ? `Umsatzsteuer (${taxRate.toFixed(0)}%):` : 'Umsatzsteuer:';
  page.drawText(ustLabel, { x: totalsX, y, size: 9, font: regular, color: grayColor });
  drawRightAligned(page, formatEur(taxAmount), mainX + tableWidth, y, regular, 9, BLACK);
  y -= 2;

  page.drawLine({ start: { x: totalsX, y }, end: { x: mainX + tableWidth, y }, thickness: 0.5, color: grayColor });
  y -= 16;

  page.drawText('Gesamtbetrag:', { x: totalsX, y, size: 10, font: bold, color: BLACK });
  drawRightAligned(page, formatEur(grossAmount), mainX + tableWidth, y, bold, 10, accentColor);

  // Tax note / VAT note (left side of main area)
  let noteY = y + 16;
  if (!isRegelbesteuerung && options.showVatNote !== false) {
    page.drawText('Gemäß § 19 UStG wird keine', { x: mainX, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
    page.drawText('Umsatzsteuer berechnet.', { x: mainX, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
  }

  y -= 50;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie den Gesamtbetrag von ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen`,
    { x: mainX, y, size: 9, font: regular, color: BLACK },
  );
  y -= 13;
  page.drawText(
    `auf das genannte Konto. Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: mainX, y, size: 9, font: regular, color: BLACK },
  );
}
