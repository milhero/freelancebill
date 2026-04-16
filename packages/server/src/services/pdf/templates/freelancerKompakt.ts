import { rgb } from 'pdf-lib';
import type { PdfTemplateContext } from '../types.js';
import { formatEur, formatDate, drawRightAligned, calcTax, toNum } from '../helpers.js';

const BODY_COLOR = rgb(0.15, 0.15, 0.15);
const LABEL_GRAY = rgb(0.50, 0.50, 0.50);
const LINE_GRAY = rgb(0.78, 0.78, 0.78);
const LIGHT_BG = rgb(0.965, 0.965, 0.965);

/**
 * Freelancer Kompakt — Everything on one page, no wasted space, compact but readable.
 * Thin accent top bar instead of "RECHNUNG" header. Compact layout throughout.
 */
export function renderFreelancerKompakt(ctx: PdfTemplateContext): void {
  const { page, invoice, client, settings, options, accentColor, fonts, width, height } = ctx;
  const { regular: helvetica, bold: helveticaBold } = fonts;

  const margin = 50; // tighter margins

  // --- TOP BAR: thin accent-colored line across full width ---
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 2,
    color: accentColor,
  });

  let y = height - 30;

  // --- COMPACT META ROW: invoice number, date, due date, service date ---
  const metaSize = 8;
  const metaGap = 8;

  const metaParts: string[] = [
    `Nr. ${invoice.invoiceNumber}`,
    `Datum: ${formatDate(invoice.invoiceDate)}`,
    `Fällig: ${formatDate(invoice.paymentDueDate)}`,
  ];

  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    metaParts.push(`Zeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`);
  } else if (invoice.serviceDate) {
    metaParts.push(`Leistung: ${formatDate(invoice.serviceDate)}`);
  }

  let metaX = margin;
  for (let i = 0; i < metaParts.length; i++) {
    const isFirst = i === 0;
    page.drawText(metaParts[i], {
      x: metaX,
      y,
      size: metaSize,
      font: isFirst ? helveticaBold : helvetica,
      color: isFirst ? accentColor : LABEL_GRAY,
    });
    metaX += helvetica.widthOfTextAtSize(metaParts[i], metaSize) + metaGap;

    // Separator dot
    if (i < metaParts.length - 1) {
      page.drawText('·', { x: metaX - 5, y, size: metaSize, font: helvetica, color: LINE_GRAY });
    }
  }

  y -= 20;

  // Thin separator
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.3,
    color: LINE_GRAY,
  });

  y -= 18;

  // --- ADDRESSES: side by side, compact ---
  const halfWidth = (width - 2 * margin - 30) / 2;

  // Sender (left)
  const senderLabel = 'Von:';
  page.drawText(senderLabel, { x: margin, y, size: 7, font: helveticaBold, color: LABEL_GRAY });
  y -= 12;

  const senderLines = [
    settings.fullName,
    settings.addressStreet,
    settings.addressZip && settings.addressCity
      ? `${settings.addressZip} ${settings.addressCity}`
      : settings.addressCity,
    settings.email,
  ].filter(Boolean);

  let senderY = y;
  for (const line of senderLines) {
    page.drawText(line, { x: margin, y: senderY, size: 8, font: helvetica, color: BODY_COLOR });
    senderY -= 11;
  }

  // Recipient (right)
  const recipientX = margin + halfWidth + 30;
  page.drawText('An:', { x: recipientX, y: y + 12, size: 7, font: helveticaBold, color: LABEL_GRAY });

  const recipientLines = [
    client?.name,
    client?.addressStreet,
    client?.addressZip && client?.addressCity
      ? `${client.addressZip} ${client.addressCity}`
      : client?.addressCity,
  ].filter(Boolean);

  let recipientY = y;
  for (const line of recipientLines) {
    page.drawText(line, { x: recipientX, y: recipientY, size: 8, font: helvetica, color: BODY_COLOR });
    recipientY -= 11;
  }

  y = Math.min(senderY, recipientY) - 12;

  // --- DESCRIPTION ---
  if (invoice.description) {
    page.drawText(invoice.description, { x: margin, y, size: 9, font: helveticaBold, color: BODY_COLOR });
    y -= 12;
  }
  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, { x: margin, y, size: 8, font: helvetica, color: LABEL_GRAY });
    y -= 12;
  }

  y -= 12;

  // --- TABLE: minimal, thin borders, small font ---
  const tableX = margin;
  const tableWidth = width - 2 * margin;
  const tableRight = tableX + tableWidth;
  const colDesc = tableWidth * 0.46;
  const colHours = tableWidth * 0.14;
  const colRate = tableWidth * 0.20;
  const colTotal = tableWidth * 0.20;

  // Header border
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.5,
    color: accentColor,
  });

  const headerTextY = y - 14;

  page.drawText('Beschreibung', { x: tableX + 4, y: headerTextY, size: 7.5, font: helveticaBold, color: LABEL_GRAY });
  drawRightAligned(page, 'Stunden', tableX + colDesc + colHours - 4, headerTextY, helveticaBold, 7.5, LABEL_GRAY);
  drawRightAligned(page, 'Einzelpreis', tableX + colDesc + colHours + colRate - 4, headerTextY, helveticaBold, 7.5, LABEL_GRAY);
  drawRightAligned(page, 'Gesamt', tableRight - 4, headerTextY, helveticaBold, 7.5, LABEL_GRAY);

  y -= 20;
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.3,
    color: LINE_GRAY,
  });

  // Data row with light background
  const rowHeight = 22;
  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: LIGHT_BG,
  });

  const rowTextY = y - rowHeight + 7;
  const totalAmount = toNum(invoice.totalAmount);

  page.drawText(invoice.description || '', { x: tableX + 4, y: rowTextY, size: 8.5, font: helvetica, color: BODY_COLOR });

  if (invoice.billingType === 'hourly') {
    const hours = toNum(invoice.hours);
    const hourlyRate = toNum(invoice.hourlyRate);
    drawRightAligned(page, hours.toFixed(2).replace('.', ','), tableX + colDesc + colHours - 4, rowTextY, helvetica, 8.5, BODY_COLOR);
    drawRightAligned(page, formatEur(hourlyRate), tableX + colDesc + colHours + colRate - 4, rowTextY, helvetica, 8.5, BODY_COLOR);
  }

  drawRightAligned(page, formatEur(totalAmount), tableRight - 4, rowTextY, helvetica, 8.5, BODY_COLOR);

  y -= rowHeight;
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableRight, y },
    thickness: 0.3,
    color: LINE_GRAY,
  });

  y -= 18;

  // --- TAX ---
  const taxMode = options.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  const { netAmount, taxAmount, grossAmount, isRegelbesteuerung } = calcTax(totalAmount, taxMode, taxRate);

  const totalsLabelX = tableRight - 180;

  page.drawText('Nettobetrag:', { x: totalsLabelX, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(netAmount), tableRight, y, helvetica, 8.5, BODY_COLOR);
  y -= 13;

  const ustLabel = isRegelbesteuerung ? `USt. (${taxRate.toFixed(0)}%):` : 'USt.:';
  page.drawText(ustLabel, { x: totalsLabelX, y, size: 8.5, font: helvetica, color: LABEL_GRAY });
  drawRightAligned(page, formatEur(taxAmount), tableRight, y, helvetica, 8.5, BODY_COLOR);
  y -= 3;

  page.drawLine({
    start: { x: totalsLabelX, y },
    end: { x: tableRight, y },
    thickness: 0.3,
    color: LINE_GRAY,
  });
  y -= 13;

  page.drawText('Gesamt:', { x: totalsLabelX, y, size: 9, font: helveticaBold, color: BODY_COLOR });
  drawRightAligned(page, formatEur(grossAmount), tableRight, y, helveticaBold, 9, accentColor);

  // Tax notes left
  let noteY = y + 13;
  if (!isRegelbesteuerung) {
    if (options.showVatNote !== false) {
      page.drawText('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', {
        x: margin, y: noteY, size: 7, font: helvetica, color: LABEL_GRAY,
      });
      noteY -= 10;
    }
  }
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, { x: margin, y: noteY, size: 7, font: helvetica, color: LABEL_GRAY });
    noteY -= 10;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, { x: margin, y: noteY, size: 7, font: helvetica, color: LABEL_GRAY });
    noteY -= 10;
  }

  y -= 35;

  // --- BANK DETAILS + PAYMENT: compact two-column layout ---
  const leftColX = margin;
  const rightColX = margin + (width - 2 * margin) / 2 + 10;

  // Left column: bank details
  page.drawText('Bankverbindung', { x: leftColX, y, size: 8.5, font: helveticaBold, color: BODY_COLOR });
  let bankY = y - 14;

  const bankDetails: [string, string][] = [
    ['Inhaber:', settings.fullName || ''],
    ['IBAN:', settings.iban || ''],
    ['BIC:', settings.bic || ''],
    ['Bank:', settings.bankName || ''],
  ];

  for (const [label, value] of bankDetails) {
    page.drawText(label, { x: leftColX, y: bankY, size: 8, font: helvetica, color: LABEL_GRAY });
    page.drawText(value, { x: leftColX + 50, y: bankY, size: 8, font: helvetica, color: BODY_COLOR });
    bankY -= 11;
  }

  // Right column: payment instruction
  page.drawText('Zahlungshinweis', { x: rightColX, y, size: 8.5, font: helveticaBold, color: BODY_COLOR });
  let payY = y - 14;

  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(`Betrag: ${formatEur(grossAmount)}`, { x: rightColX, y: payY, size: 8, font: helvetica, color: BODY_COLOR });
  payY -= 11;
  page.drawText(`Frist: ${paymentDays} Tage`, { x: rightColX, y: payY, size: 8, font: helvetica, color: BODY_COLOR });
  payY -= 11;
  page.drawText(`Verwendungszweck: ${invoice.invoiceNumber}`, { x: rightColX, y: payY, size: 8, font: helvetica, color: BODY_COLOR });

  // --- FOOTER: integrated, no separate line ---
  const footerY = 28;
  const footerText = `${settings.fullName || ''} | ${settings.addressStreet || ''} | ${settings.addressZip || ''} ${settings.addressCity || ''} | ${settings.email || ''}`;
  page.drawText(footerText, { x: margin, y: footerY, size: 6.5, font: helvetica, color: LABEL_GRAY });
}
