import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const BLACK = rgb(0, 0, 0);

/**
 * Template "Beratung" — Consulting focused, professional hourly breakdown.
 * Clean, structured, muted color palette with thin borders.
 */
export function renderBeratung(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, grayColor, fonts, margin, width, height } = ctx;
  const { regular, bold } = fonts;

  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  // Muted accent for subtle use
  const mutedAccent = rgb(
    accentColor.red * 0.7 + 0.3,
    accentColor.green * 0.7 + 0.3,
    accentColor.blue * 0.7 + 0.3,
  );

  let y = height - margin;
  const rightEdge = width - margin;

  // --- HEADER ---
  // "RECHNUNG" small, top-left, muted accent
  page.drawText('RECHNUNG', { x: margin, y, size: 14, font: bold, color: mutedAccent });

  // Invoice meta top-right (clean, structured)
  const metaSize = 9;
  const metaLabelX = rightEdge - 170;

  const metaItems: [string, string][] = [
    ['Rechnungsnr.:', invoice.invoiceNumber],
    ['Datum:', formatDate(invoice.invoiceDate)],
    ['Zahlungsziel:', formatDate(invoice.paymentDueDate)],
  ];

  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    metaItems.push(['Zeitraum:', `${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`]);
  } else if (invoice.serviceDate) {
    metaItems.push(['Leistungsdatum:', formatDate(invoice.serviceDate)]);
  }

  let metaY = y + 2;
  for (const [label, value] of metaItems) {
    page.drawText(label, { x: metaLabelX, y: metaY, size: metaSize, font: regular, color: grayColor });
    drawRightAligned(page, value, rightEdge, metaY, regular, metaSize, BLACK);
    metaY -= 14;
  }

  y -= 50;

  // --- ADDRESSES: sender right, recipient left ---
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

  // Sender (right column)
  const senderX = rightEdge - 180;
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

  y -= 30;

  // --- Service description as paragraph above table ---
  if (invoice.description) {
    page.drawText(invoice.description, { x: margin, y, size: 11, font: bold, color: BLACK });
    y -= 16;
  }
  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 9, font: regular, color: grayColor });
    y -= 14;
  }
  y -= 20;

  // --- TABLE ---
  const isHourly = invoice.billingType === 'hourly';
  const tableX = margin;

  // Columns differ by billing type
  const colWidths = isHourly ? [220, 60, 80, 80] : [320, 120];
  const headers = isHourly
    ? ['Leistung', 'Stunden', 'Satz', 'Betrag']
    : ['Leistung', 'Betrag'];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerHeight = 24;

  // Header — text only, thin top and bottom border
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableWidth, y }, thickness: 0.5, color: accentColor });

  let colX = tableX + 6;
  const headerTextY = y - headerHeight + 8;
  for (let i = 0; i < headers.length; i++) {
    if (i === 0) {
      page.drawText(headers[i], { x: colX, y: headerTextY, size: 9, font: bold, color: BLACK });
    } else {
      drawRightAligned(page, headers[i], colX + colWidths[i] - 6, headerTextY, bold, 9, BLACK);
    }
    colX += colWidths[i];
  }

  y -= headerHeight;
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableWidth, y }, thickness: 0.5, color: accentColor });

  // Data row — no background, clean
  const rowHeight = 28;
  const rowY = y - rowHeight + 10;
  const totalAmount = toNum(invoice.totalAmount);

  page.drawText(invoice.description || '', { x: tableX + 6, y: rowY, size: 9, font: regular, color: BLACK });

  if (isHourly) {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    let cx = tableX + colWidths[0];
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), cx + colWidths[1] - 6, rowY, regular, 9, BLACK);
    cx += colWidths[1];
    drawRightAligned(page, formatEur(hourlyRate), cx + colWidths[2] - 6, rowY, regular, 9, BLACK);
    cx += colWidths[2];
    drawRightAligned(page, formatEur(totalAmount), cx + colWidths[3] - 6, rowY, regular, 9, BLACK);
  } else {
    drawRightAligned(page, formatEur(totalAmount), tableX + tableWidth - 6, rowY, regular, 9, BLACK);
  }

  y -= rowHeight;
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX + tableWidth, y }, thickness: 0.5, color: grayColor });

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

  page.drawLine({ start: { x: totalsX, y }, end: { x: tableX + tableWidth, y }, thickness: 0.5, color: grayColor });
  y -= 16;

  page.drawText('Gesamtbetrag:', { x: totalsX, y, size: 10, font: bold, color: BLACK });
  drawRightAligned(page, formatEur(grossAmount), tableX + tableWidth, y, bold, 10, accentColor);

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

  // --- BANK DETAILS ---
  page.drawText('Bankverbindung', { x: margin, y, size: 10, font: bold, color: BLACK });
  y -= 18;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: margin, y, size: 9, font: regular, color: grayColor });
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
  page.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: width - margin, y: footerY + 10 }, thickness: 0.5, color: grayColor });

  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY - 5, size: 7, font: regular, color: grayColor });
}
