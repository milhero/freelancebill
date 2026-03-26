import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const WHITE = rgb(1, 1, 1);

/**
 * Standard invoice template — direct refactor of the original generateInvoicePdf layout.
 * Uses ctx.accentColor instead of hardcoded DARK_BLUE.
 */
export function renderStandard(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, grayColor, lightGrayBg, fonts, margin, width } = ctx;
  const { regular: helvetica, bold: helveticaBold } = fonts;

  let y = ctx.height - margin;

  // --- HEADER ---
  // "RECHNUNG" top left
  page.drawText('RECHNUNG', {
    x: margin,
    y,
    size: 24,
    font: helveticaBold,
    color: accentColor,
  });

  // Invoice meta top right
  const metaX = width - margin;
  const metaSize = 9;

  drawRightAligned(page, `Rechnungsnr.: ${invoice.invoiceNumber}`, metaX, y + 4, helvetica, metaSize, grayColor);
  drawRightAligned(page, `Rechnungsdatum: ${formatDate(invoice.invoiceDate)}`, metaX, y - 10, helvetica, metaSize, grayColor);
  drawRightAligned(page, `Zahlungsziel: ${formatDate(invoice.paymentDueDate)}`, metaX, y - 24, helvetica, metaSize, grayColor);

  // Leistungsdatum / Leistungszeitraum
  let metaBottomY = y - 38;
  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    drawRightAligned(
      page,
      `Leistungszeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`,
      metaX, metaBottomY, helvetica, metaSize, grayColor,
    );
    metaBottomY -= 14;
  } else if (invoice.serviceDate) {
    drawRightAligned(page, `Leistungsdatum: ${formatDate(invoice.serviceDate)}`, metaX, metaBottomY, helvetica, metaSize, grayColor);
    metaBottomY -= 14;
  }

  y -= 50;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: grayColor,
  });

  y -= 30;

  // --- Small sender line above recipient ---
  const senderLine = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''}`;
  page.drawText(senderLine, {
    x: margin,
    y,
    size: 7,
    font: helvetica,
    color: grayColor,
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
    page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: accentColor });
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
    page.drawText(line, { x: senderX, y: senderY, size: 9, font: helvetica, color: grayColor });
    senderY -= 13;
  }

  y -= 40;

  // --- SUBJECT ---
  page.drawText(invoice.description || '', {
    x: margin,
    y,
    size: 11,
    font: helveticaBold,
    color: accentColor,
  });
  y -= 16;

  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 9, font: helvetica, color: grayColor });
    y -= 14;
  }

  y -= 25;

  // --- TABLE ---
  const tableX = margin;
  const colWidths = [230, 70, 90, 90];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 32;
  const headerHeight = 28;

  // Table header background
  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: accentColor,
  });

  // Header text
  const headers = ['Beschreibung', 'Stunden', 'Einzelpreis', 'Gesamt'];
  let colX = tableX + 8;
  for (let i = 0; i < headers.length; i++) {
    if (i > 0) {
      drawRightAligned(page, headers[i], colX + colWidths[i] - 8, y - headerHeight + 9, helveticaBold, 9, WHITE);
    } else {
      page.drawText(headers[i], { x: colX, y: y - headerHeight + 9, size: 9, font: helveticaBold, color: WHITE });
    }
    colX += colWidths[i];
  }

  y -= headerHeight;

  // Table row
  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: lightGrayBg,
  });

  colX = tableX + 8;
  const rowY = y - rowHeight + 10;

  // Description
  page.drawText(invoice.description || '', { x: colX, y: rowY, size: 9, font: helvetica, color: accentColor });
  colX += colWidths[0];

  const totalAmount = toNum(invoice.totalAmount);

  if (invoice.billingType === 'hourly') {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);

    // Hours
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), colX + colWidths[1] - 8, rowY, helvetica, 9, accentColor);
    colX += colWidths[1];
    // Hourly rate
    drawRightAligned(page, formatEur(hourlyRate), colX + colWidths[2] - 8, rowY, helvetica, 9, accentColor);
    colX += colWidths[2];
  } else {
    colX += colWidths[1]; // skip hours
    colX += colWidths[2]; // skip rate
  }

  // Total
  drawRightAligned(page, formatEur(totalAmount), colX + colWidths[3] - 8, rowY, helvetica, 9, accentColor);

  y -= rowHeight;
  y -= 25;

  // --- TAX CALCULATION ---
  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  // --- TOTALS ---
  const totalsX = tableX + tableWidth - 200;

  // Nettobetrag
  page.drawText('Nettobetrag:', { x: totalsX, y, size: 9, font: helvetica, color: grayColor });
  drawRightAligned(page, formatEur(netAmount), tableX + tableWidth, y, helvetica, 9, accentColor);
  y -= 16;

  // USt
  const ustLabel = isRegelbesteuerung ? `Umsatzsteuer (${taxRate.toFixed(0)}%):` : 'Umsatzsteuer:';
  page.drawText(ustLabel, { x: totalsX, y, size: 9, font: helvetica, color: grayColor });
  drawRightAligned(page, formatEur(taxAmount), tableX + tableWidth, y, helvetica, 9, accentColor);
  y -= 2;

  // Line before total
  page.drawLine({
    start: { x: totalsX, y },
    end: { x: tableX + tableWidth, y },
    thickness: 0.5,
    color: grayColor,
  });
  y -= 16;

  // Gesamtbetrag
  page.drawText('Gesamtbetrag:', { x: totalsX, y, size: 10, font: helveticaBold, color: accentColor });
  drawRightAligned(page, formatEur(grossAmount), tableX + tableWidth, y, helveticaBold, 10, accentColor);

  // Tax note / IDs (left of totals)
  let noteY = y + 16;
  if (!isRegelbesteuerung) {
    const showVatNote = options.showVatNote !== false;
    if (showVatNote) {
      page.drawText('Gemäß § 19 UStG wird keine', { x: margin, y: noteY, size: 8, font: helvetica, color: grayColor });
      noteY -= 11;
      page.drawText('Umsatzsteuer berechnet.', { x: margin, y: noteY, size: 8, font: helvetica, color: grayColor });
      noteY -= 11;
    }
  }

  // Show tax ID / VAT ID
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, { x: margin, y: noteY, size: 8, font: helvetica, color: grayColor });
    noteY -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: margin, y: noteY, size: 8, font: helvetica, color: grayColor });
    noteY -= 11;
  }

  y -= 50;

  // --- BANK DETAILS ---
  page.drawText('Bankverbindung', { x: margin, y, size: 10, font: helveticaBold, color: accentColor });
  y -= 18;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: margin, y, size: 9, font: helvetica, color: grayColor });
    page.drawText(value, { x: margin + 90, y, size: 9, font: helvetica, color: accentColor });
    y -= 14;
  }

  y -= 20;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie den Gesamtbetrag von ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen`,
    { x: margin, y, size: 9, font: helvetica, color: accentColor },
  );
  y -= 13;
  page.drawText(
    `auf das oben genannte Konto. Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: margin, y, size: 9, font: helvetica, color: accentColor },
  );

  // --- FOOTER ---
  const footerY = 40;
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: width - margin, y: footerY + 10 },
    thickness: 0.5,
    color: grayColor,
  });

  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY - 5, size: 7, font: helvetica, color: grayColor });
}
