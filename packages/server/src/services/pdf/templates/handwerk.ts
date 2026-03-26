import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

/**
 * Template "Handwerk" — Trades/craftsmen focused with position numbers,
 * sturdy lines, and alternating row colors.
 */
export function renderHandwerk(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, grayColor, lightGrayBg, fonts, margin, width, height } = ctx;
  const { regular, bold } = fonts;

  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  let y = height - margin;

  // --- HEADER ---
  page.drawText('RECHNUNG', { x: margin, y, size: 22, font: bold, color: accentColor });

  // Invoice meta top right
  const metaX = width - margin;
  const metaSize = 9;
  drawRightAligned(page, `Rechnungsnr.: ${invoice.invoiceNumber}`, metaX, y + 4, regular, metaSize, grayColor);
  drawRightAligned(page, `Rechnungsdatum: ${formatDate(invoice.invoiceDate)}`, metaX, y - 10, regular, metaSize, grayColor);
  drawRightAligned(page, `Zahlungsziel: ${formatDate(invoice.paymentDueDate)}`, metaX, y - 24, regular, metaSize, grayColor);

  let metaBottomY = y - 38;
  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    drawRightAligned(page, `Leistungszeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`, metaX, metaBottomY, regular, metaSize, grayColor);
    metaBottomY -= 14;
  } else if (invoice.serviceDate) {
    drawRightAligned(page, `Leistungsdatum: ${formatDate(invoice.serviceDate)}`, metaX, metaBottomY, regular, metaSize, grayColor);
    metaBottomY -= 14;
  }

  y -= 50;

  // Sturdy horizontal line (1pt)
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: accentColor });
  y -= 30;

  // --- Small sender line ---
  const senderLine = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''}`;
  page.drawText(senderLine, { x: margin, y, size: 7, font: regular, color: grayColor });
  y -= 20;

  // --- ADDRESSES ---
  // Recipient (left)
  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity ? `${client.addressZip} ${client.addressCity}` : client?.addressCity,
  ].filter(Boolean);

  for (const line of recipientLines) {
    page.drawText(line, { x: margin, y, size: 10, font: regular, color: BLACK });
    y -= 14;
  }

  // Sender details (right)
  const senderX = width - margin - 180;
  let senderY = y + recipientLines.length * 14;
  const senderDetails = [
    settings.fullName,
    settings.addressStreet,
    settings.addressZip && settings.addressCity ? `${settings.addressZip} ${settings.addressCity}` : settings.addressCity,
    '',
    settings.email,
    settings.phone,
  ].filter((l) => l !== undefined);

  for (const line of senderDetails) {
    if (line === '') { senderY -= 8; continue; }
    page.drawText(line, { x: senderX, y: senderY, size: 9, font: regular, color: grayColor });
    senderY -= 13;
  }

  y -= 40;

  // --- SUBJECT ---
  page.drawText(invoice.description || '', { x: margin, y, size: 11, font: bold, color: BLACK });
  y -= 16;
  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 9, font: regular, color: grayColor });
    y -= 14;
  }
  y -= 25;

  // --- TABLE with Pos. column ---
  const tableX = margin;
  const isHourly = invoice.billingType === 'hourly';

  // Pos.(40) | Beschreibung(200) | Menge/Std(60) | Einzelpreis(80) | Gesamt(80)
  const colWidths = isHourly ? [40, 200, 60, 80, 80] : [40, 280, 80, 0, 60];
  const headers = isHourly
    ? ['Pos.', 'Beschreibung', 'Menge/Std', 'Einzelpreis', 'Gesamt']
    : ['Pos.', 'Beschreibung', '', '', 'Gesamt'];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerHeight = 28;
  const rowHeight = 32;

  // Header background
  page.drawRectangle({ x: tableX, y: y - headerHeight, width: tableWidth, height: headerHeight, color: accentColor });

  // Header text
  let colX = tableX + 8;
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) { colX += colWidths[i]; continue; }
    if (i === 0 || i === 1) {
      page.drawText(headers[i], { x: colX, y: y - headerHeight + 9, size: 9, font: bold, color: WHITE });
    } else {
      drawRightAligned(page, headers[i], colX + colWidths[i] - 8, y - headerHeight + 9, bold, 9, WHITE);
    }
    colX += colWidths[i];
  }

  y -= headerHeight;

  // Data row (position 1) — alternating: row 0 = lightGray
  page.drawRectangle({ x: tableX, y: y - rowHeight, width: tableWidth, height: rowHeight, color: lightGrayBg });

  const rowY = y - rowHeight + 10;
  const totalAmount = toNum(invoice.totalAmount);

  colX = tableX + 8;
  // Pos.
  page.drawText('1', { x: colX, y: rowY, size: 9, font: regular, color: BLACK });
  colX += colWidths[0];
  // Description
  page.drawText(invoice.description || '', { x: colX, y: rowY, size: 9, font: regular, color: BLACK });
  colX += colWidths[1];

  if (isHourly) {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), colX + colWidths[2] - 8, rowY, regular, 9, BLACK);
    colX += colWidths[2];
    drawRightAligned(page, formatEur(hourlyRate), colX + colWidths[3] - 8, rowY, regular, 9, BLACK);
    colX += colWidths[3];
    drawRightAligned(page, formatEur(totalAmount), colX + colWidths[4] - 8, rowY, regular, 9, BLACK);
  } else {
    colX += colWidths[2] + colWidths[3];
    drawRightAligned(page, formatEur(totalAmount), colX + colWidths[4] - 8, rowY, regular, 9, BLACK);
  }

  y -= rowHeight;

  // Sturdy bottom line
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableWidth, y }, thickness: 1, color: accentColor });

  // Auftragsreferenz
  if (invoice.projectSubtitle) {
    y -= 16;
    page.drawText(`Auftragsreferenz: ${invoice.projectSubtitle}`, { x: margin, y, size: 8, font: regular, color: grayColor });
  }

  y -= 25;

  // --- TAX CALCULATION ---
  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  const totalsX = tableX + tableWidth - 200;

  page.drawText('Nettobetrag:', { x: totalsX, y, size: 9, font: regular, color: grayColor });
  drawRightAligned(page, formatEur(netAmount), tableX + tableWidth, y, regular, 9, BLACK);
  y -= 16;

  const ustLabel = isRegelbesteuerung ? `Umsatzsteuer (${taxRate.toFixed(0)}%):` : 'Umsatzsteuer:';
  page.drawText(ustLabel, { x: totalsX, y, size: 9, font: regular, color: grayColor });
  drawRightAligned(page, formatEur(taxAmount), tableX + tableWidth, y, regular, 9, BLACK);
  y -= 2;

  page.drawLine({ start: { x: totalsX, y }, end: { x: tableX + tableWidth, y }, thickness: 1, color: accentColor });
  y -= 16;

  page.drawText('Gesamtbetrag:', { x: totalsX, y, size: 11, font: bold, color: BLACK });
  drawRightAligned(page, formatEur(grossAmount), tableX + tableWidth, y, bold, 11, BLACK);

  // Tax note / IDs (left)
  let noteY = y + 16;
  if (!isRegelbesteuerung && options.showVatNote !== false) {
    page.drawText('Gemäß § 19 UStG wird keine', { x: margin, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
    page.drawText('Umsatzsteuer berechnet.', { x: margin, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
  }
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, { x: margin, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: margin, y: noteY, size: 8, font: regular, color: grayColor });
    noteY -= 11;
  }

  y -= 50;

  // --- BANK DETAILS (prominent) ---
  page.drawText('Bankverbindung', { x: margin, y, size: 10, font: bold, color: BLACK });
  y -= 18;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: margin, y, size: 9, font: bold, color: grayColor });
    page.drawText(value, { x: margin + 90, y, size: 9, font: regular, color: BLACK });
    y -= 14;
  }

  y -= 20;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie den Gesamtbetrag von ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen`,
    { x: margin, y, size: 9, font: regular, color: BLACK },
  );
  y -= 13;
  page.drawText(
    `auf das oben genannte Konto. Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: margin, y, size: 9, font: regular, color: BLACK },
  );

  // --- FOOTER ---
  const footerY = 40;
  page.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: width - margin, y: footerY + 10 }, thickness: 1, color: accentColor });

  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY - 5, size: 7, font: regular, color: grayColor });
}
