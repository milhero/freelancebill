import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const BLACK = rgb(0, 0, 0);
const BODY_COLOR = rgb(0.15, 0.15, 0.15);
const LABEL_GRAY = rgb(0.45, 0.45, 0.45);
const LINE_GRAY = rgb(0.70, 0.70, 0.70);
const FOLD_MARK_GRAY = rgb(0.75, 0.75, 0.75);

// DIN 5008 constants (mm to pt: 1mm = 2.8346pt)
const MM = 2.8346;

/**
 * Serios Klassisch — Traditional German DIN 5008 business letter format.
 * Fold marks, punch mark, address window positioning, conservative design.
 */
export function renderSeriosKlassisch(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, fonts, width, height } = ctx;
  const { regular: helvetica, bold: helveticaBold } = fonts;

  const margin = 60;

  // --- FOLD MARKS & PUNCH MARK (DIN 676) ---
  // First fold mark at 105mm from top
  const foldY1 = height - 105 * MM;
  page.drawLine({
    start: { x: 10, y: foldY1 },
    end: { x: 20, y: foldY1 },
    thickness: 0.3,
    color: FOLD_MARK_GRAY,
  });

  // Second fold mark at 210mm from top
  const foldY2 = height - 210 * MM;
  page.drawLine({
    start: { x: 10, y: foldY2 },
    end: { x: 20, y: foldY2 },
    thickness: 0.3,
    color: FOLD_MARK_GRAY,
  });

  // Punch mark at 148.5mm from top
  const punchY = height - 148.5 * MM;
  page.drawLine({
    start: { x: 10, y: punchY },
    end: { x: 16, y: punchY },
    thickness: 0.3,
    color: FOLD_MARK_GRAY,
  });

  // --- SENDER NAME top-right ---
  let y = height - margin;
  const rightEdge = width - margin;

  // Sender details right-aligned, formal
  const senderRightLines = [
    settings.fullName,
    settings.addressStreet,
    settings.addressZip && settings.addressCity
      ? `${settings.addressZip} ${settings.addressCity}`
      : settings.addressCity,
    '',
    settings.email,
    settings.phone,
  ].filter((l) => l !== undefined);

  let senderRY = y;
  for (const line of senderRightLines) {
    if (line === '') {
      senderRY -= 6;
      continue;
    }
    const isName = line === settings.fullName;
    drawRightAligned(
      page, line, rightEdge, senderRY,
      isName ? helveticaBold : helvetica,
      isName ? 11 : 9,
      isName ? accentColor : LABEL_GRAY,
    );
    senderRY -= 13;
  }

  // --- "RECHNUNG" title ---
  page.drawText('RECHNUNG', {
    x: margin,
    y,
    size: 14,
    font: helveticaBold,
    color: accentColor,
  });

  // --- ADDRESS WINDOW (DIN 5008: 45mm from top, 20mm from left) ---
  const addrWindowY = height - 45 * MM;
  const addrWindowX = 20 * MM;

  // Small sender line above address
  const senderLine = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''}`;
  page.drawText(senderLine, {
    x: addrWindowX,
    y: addrWindowY,
    size: 7,
    font: helvetica,
    color: LABEL_GRAY,
  });

  // Recipient in address window
  let addrY = addrWindowY - 16;
  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity
      ? `${client.addressZip} ${client.addressCity}`
      : client?.addressCity,
  ].filter(Boolean);

  for (const line of recipientLines) {
    page.drawText(line, { x: addrWindowX, y: addrY, size: 11, font: helvetica, color: BODY_COLOR });
    addrY -= 15;
  }

  // --- META below address window ---
  y = addrY - 20;

  const metaSize = 9;
  const metaLabelWidth = 130;

  const metaItems: [string, string][] = [
    ['Rechnungsnummer:', invoice.invoiceNumber],
    ['Rechnungsdatum:', formatDate(invoice.invoiceDate)],
    ['Zahlungsziel:', formatDate(invoice.paymentDueDate)],
  ];

  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    metaItems.push(['Leistungszeitraum:', `${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`]);
  } else if (invoice.serviceDate) {
    metaItems.push(['Leistungsdatum:', formatDate(invoice.serviceDate)]);
  }

  for (const [label, value] of metaItems) {
    page.drawText(label, { x: margin, y, size: metaSize, font: helvetica, color: LABEL_GRAY });
    page.drawText(value, { x: margin + metaLabelWidth, y, size: metaSize, font: helvetica, color: BODY_COLOR });
    y -= 15;
  }

  y -= 10;

  // --- SUBJECT ---
  page.drawText(invoice.description || '', {
    x: margin,
    y,
    size: 11,
    font: helveticaBold,
    color: BODY_COLOR,
  });
  y -= 14;

  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 9, font: helvetica, color: LABEL_GRAY });
    y -= 14;
  }

  y -= 20;

  // --- TABLE (simple borders, no colored backgrounds) ---
  const tableX = margin;
  const tableWidth = width - 2 * margin;
  const colDesc = tableWidth * 0.48;
  const colHours = tableWidth * 0.14;
  const colRate = tableWidth * 0.19;
  const colTotal = tableWidth * 0.19;
  const tableRight = tableX + tableWidth;
  const headerHeight = 24;
  const rowHeight = 28;

  // Header top border
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.75,
    color: BODY_COLOR,
  });

  const headerTextY = y - headerHeight + 8;

  page.drawText('Beschreibung', { x: tableX + 6, y: headerTextY, size: 9, font: helveticaBold, color: BODY_COLOR });
  drawRightAligned(page, 'Stunden', tableX + colDesc + colHours - 6, headerTextY, helveticaBold, 9, BODY_COLOR);
  drawRightAligned(page, 'Einzelpreis', tableX + colDesc + colHours + colRate - 6, headerTextY, helveticaBold, 9, BODY_COLOR);
  drawRightAligned(page, 'Gesamt', tableRight - 6, headerTextY, helveticaBold, 9, BODY_COLOR);

  y -= headerHeight;

  // Header bottom border
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.5,
    color: LINE_GRAY,
  });

  // Data row
  const rowTextY = y - rowHeight + 9;
  const totalAmount = toNum(invoice.totalAmount);

  page.drawText(invoice.description || '', { x: tableX + 6, y: rowTextY, size: 9, font: helvetica, color: BODY_COLOR });

  if (invoice.billingType === 'hourly') {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), tableX + colDesc + colHours - 6, rowTextY, helvetica, 9, BODY_COLOR);
    drawRightAligned(page, formatEur(hourlyRate), tableX + colDesc + colHours + colRate - 6, rowTextY, helvetica, 9, BODY_COLOR);
  }

  drawRightAligned(page, formatEur(totalAmount), tableRight - 6, rowTextY, helvetica, 9, BODY_COLOR);

  y -= rowHeight;

  // Row bottom border
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.75,
    color: BODY_COLOR,
  });

  y -= 25;

  // --- TAX ---
  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  // Totals left-aligned (conservative)
  const totalsLabelX = tableRight - 220;

  page.drawText('Nettobetrag:', { x: totalsLabelX, y, size: 9, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(netAmount), tableRight, y, helvetica, 9, BODY_COLOR);
  y -= 15;

  const ustLabel = isRegelbesteuerung ? `Umsatzsteuer (${taxRate.toFixed(0)}%):` : 'Umsatzsteuer:';
  page.drawText(ustLabel, { x: totalsLabelX, y, size: 9, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(taxAmount), tableRight, y, helvetica, 9, BODY_COLOR);
  y -= 3;

  page.drawLine({
    start: { x: totalsLabelX, y },
    end: { x: tableRight, y },
    thickness: 0.5,
    color: LINE_GRAY,
  });
  y -= 15;

  page.drawText('Gesamtbetrag:', { x: totalsLabelX, y, size: 11, font: helveticaBold, color: BODY_COLOR });
  drawRightAligned(page, formatEur(grossAmount), tableRight, y, helveticaBold, 11, BODY_COLOR);

  // Tax notes left
  let noteY = y + 15;
  if (!isRegelbesteuerung) {
    if (options.showVatNote !== false) {
      page.drawText('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', {
        x: margin, y: noteY, size: 8, font: helvetica, color: LABEL_GRAY,
      });
      noteY -= 11;
    }
  }
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, { x: margin, y: noteY, size: 8, font: helvetica, color: LABEL_GRAY });
    noteY -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: margin, y: noteY, size: 8, font: helvetica, color: LABEL_GRAY });
    noteY -= 11;
  }

  y -= 50;

  // --- BANK DETAILS ---
  page.drawText('Bankverbindung', { x: margin, y, size: 11, font: helveticaBold, color: BODY_COLOR });
  y -= 18;

  const bankDetails: [string, string][] = [
    ['Kontoinhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: margin, y, size: 9, font: helvetica, color: LABEL_GRAY });
    page.drawText(value, { x: margin + 100, y, size: 9, font: helvetica, color: BODY_COLOR });
    y -= 14;
  }

  y -= 16;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie den Gesamtbetrag von ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen`,
    { x: margin, y, size: 9, font: helvetica, color: BODY_COLOR },
  );
  y -= 13;
  page.drawText(
    `auf das oben genannte Konto. Verwendungszweck: ${invoice.invoiceNumber}`,
    { x: margin, y, size: 9, font: helvetica, color: BODY_COLOR },
  );

  // --- FOOTER ---
  const footerY = 40;
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: width - margin, y: footerY + 10 },
    thickness: 0.5,
    color: LINE_GRAY,
  });

  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY - 5, size: 7, font: helvetica, color: LABEL_GRAY });
}
