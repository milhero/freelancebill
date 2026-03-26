import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

// Colors
const DARK_BLUE = rgb(0.102, 0.102, 0.180); // #1a1a2e
const GRAY_TEXT = rgb(0.533, 0.533, 0.533); // #888888
const LIGHT_GRAY_BG = rgb(0.961, 0.961, 0.961); // #f5f5f5
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

export async function generateInvoicePdf(
  invoice: any,
  client: any,
  settings: any,
  options?: { showVatNote?: boolean; taxMode?: string; taxRate?: number; taxId?: string | null; vatId?: string | null },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 60;
  let y = height - margin;

  // Helper to format EUR amounts
  const formatEur = (amount: number) => {
    return amount.toFixed(2).replace('.', ',') + ' EUR';
  };

  // Helper to format date as DD.MM.YYYY
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  // Right-align helper
  const drawRightAligned = (
    text: string,
    xRight: number,
    yPos: number,
    font: PDFFont,
    size: number,
    color = DARK_BLUE,
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - textWidth, y: yPos, size, font, color });
  };

  // --- HEADER ---
  // "RECHNUNG" top left
  page.drawText('RECHNUNG', {
    x: margin,
    y: y,
    size: 24,
    font: helveticaBold,
    color: DARK_BLUE,
  });

  // Invoice meta top right
  const metaX = width - margin;
  const metaSize = 9;

  drawRightAligned(
    `Rechnungsnr.: ${invoice.invoiceNumber}`,
    metaX,
    y + 4,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
    `Rechnungsdatum: ${formatDate(invoice.invoiceDate)}`,
    metaX,
    y - 10,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
    `Zahlungsziel: ${formatDate(invoice.paymentDueDate)}`,
    metaX,
    y - 24,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );

  // Leistungsdatum / Leistungszeitraum
  let metaBottomY = y - 38;
  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    drawRightAligned(
      `Leistungszeitraum: ${formatDate(invoice.servicePeriodStart)} - ${formatDate(invoice.servicePeriodEnd)}`,
      metaX,
      metaBottomY,
      helvetica,
      metaSize,
      GRAY_TEXT,
    );
    metaBottomY -= 14;
  } else if (invoice.serviceDate) {
    drawRightAligned(
      `Leistungsdatum: ${formatDate(invoice.serviceDate)}`,
      metaX,
      metaBottomY,
      helvetica,
      metaSize,
      GRAY_TEXT,
    );
    metaBottomY -= 14;
  }

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
  page.drawText(invoice.description || '', {
    x: margin,
    y,
    size: 11,
    font: helveticaBold,
    color: DARK_BLUE,
  });
  y -= 16;

  if (invoice.projectSubtitle) {
    page.drawText(invoice.projectSubtitle, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: GRAY_TEXT,
    });
    y -= 14;
  }

  y -= 25;

  // --- TABLE ---
  const tableX = margin;
  const colWidths = [230, 70, 90, 90]; // Beschreibung, Stunden, Einzelpreis, Gesamt
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 32;
  const headerHeight = 28;

  // Table header background
  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: DARK_BLUE,
  });

  // Header text
  const headers = ['Beschreibung', 'Stunden', 'Einzelpreis', 'Gesamt'];
  let colX = tableX + 8;
  for (let i = 0; i < headers.length; i++) {
    if (i > 0) {
      drawRightAligned(
        headers[i],
        colX + colWidths[i] - 8,
        y - headerHeight + 9,
        helveticaBold,
        9,
        WHITE,
      );
    } else {
      page.drawText(headers[i], {
        x: colX,
        y: y - headerHeight + 9,
        size: 9,
        font: helveticaBold,
        color: WHITE,
      });
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
    color: LIGHT_GRAY_BG,
  });

  colX = tableX + 8;
  const rowY = y - rowHeight + 10;

  // Description
  page.drawText(invoice.description || '', {
    x: colX,
    y: rowY,
    size: 9,
    font: helvetica,
    color: DARK_BLUE,
  });
  colX += colWidths[0];

  const totalAmount =
    typeof invoice.totalAmount === 'number'
      ? invoice.totalAmount
      : parseFloat(invoice.totalAmount || '0');

  if (invoice.billingType === 'hourly') {
    const hours =
      typeof invoice.hours === 'number'
        ? invoice.hours
        : parseFloat(invoice.hours || '0');
    const hourlyRate =
      typeof invoice.hourlyRate === 'number'
        ? invoice.hourlyRate
        : parseFloat(invoice.hourlyRate || '0');

    // Hours
    drawRightAligned(
      hours.toFixed(2).replace('.', ','),
      colX + colWidths[1] - 8,
      rowY,
      helvetica,
      9,
      DARK_BLUE,
    );
    colX += colWidths[1];
    // Hourly rate
    drawRightAligned(
      formatEur(hourlyRate),
      colX + colWidths[2] - 8,
      rowY,
      helvetica,
      9,
      DARK_BLUE,
    );
    colX += colWidths[2];
  } else {
    colX += colWidths[1]; // skip hours
    colX += colWidths[2]; // skip rate
  }

  // Total
  drawRightAligned(
    formatEur(totalAmount),
    colX + colWidths[3] - 8,
    rowY,
    helvetica,
    9,
    DARK_BLUE,
  );

  y -= rowHeight;
  y -= 25;

  // --- TAX CALCULATION ---
  const taxMode = options?.taxMode ?? settings.taxMode ?? 'kleinunternehmer';
  const taxRate = options?.taxRate ?? (settings.taxRate ? parseFloat(settings.taxRate) : 19);
  const taxId = options?.taxId !== undefined ? options.taxId : (settings.taxId ?? null);
  const vatId = options?.vatId !== undefined ? options.vatId : (settings.vatId ?? null);

  const isRegelbesteuerung = taxMode === 'regelbesteuerung';
  const netAmount = totalAmount;
  const taxAmount = isRegelbesteuerung ? Math.round(netAmount * taxRate) / 100 : 0;
  const grossAmount = netAmount + taxAmount;

  // --- TOTALS ---
  const totalsX = tableX + tableWidth - 200;

  // Nettobetrag
  page.drawText('Nettobetrag:', {
    x: totalsX,
    y,
    size: 9,
    font: helvetica,
    color: GRAY_TEXT,
  });
  drawRightAligned(
    formatEur(netAmount),
    tableX + tableWidth,
    y,
    helvetica,
    9,
    DARK_BLUE,
  );
  y -= 16;

  // USt
  const ustLabel = isRegelbesteuerung
    ? `Umsatzsteuer (${taxRate.toFixed(0)}%):`
    : 'Umsatzsteuer:';
  page.drawText(ustLabel, {
    x: totalsX,
    y,
    size: 9,
    font: helvetica,
    color: GRAY_TEXT,
  });
  drawRightAligned(formatEur(taxAmount), tableX + tableWidth, y, helvetica, 9, DARK_BLUE);
  y -= 2;

  // Line before total
  page.drawLine({
    start: { x: totalsX, y },
    end: { x: tableX + tableWidth, y },
    thickness: 0.5,
    color: GRAY_TEXT,
  });
  y -= 16;

  // Gesamtbetrag
  page.drawText('Gesamtbetrag:', {
    x: totalsX,
    y,
    size: 10,
    font: helveticaBold,
    color: DARK_BLUE,
  });
  drawRightAligned(
    formatEur(grossAmount),
    tableX + tableWidth,
    y,
    helveticaBold,
    10,
    DARK_BLUE,
  );

  // Tax note / IDs (left of totals)
  let noteY = y + 16;
  if (!isRegelbesteuerung) {
    const showVatNote = options?.showVatNote !== false;
    if (showVatNote) {
      page.drawText('Gemäß § 19 UStG wird keine', {
        x: margin,
        y: noteY,
        size: 8,
        font: helvetica,
        color: GRAY_TEXT,
      });
      noteY -= 11;
      page.drawText('Umsatzsteuer berechnet.', {
        x: margin,
        y: noteY,
        size: 8,
        font: helvetica,
        color: GRAY_TEXT,
      });
      noteY -= 11;
    }
  }

  // Show tax ID / VAT ID
  if (taxId) {
    page.drawText(`Steuernummer: ${taxId}`, {
      x: margin,
      y: noteY,
      size: 8,
      font: helvetica,
      color: GRAY_TEXT,
    });
    noteY -= 11;
  }
  if (vatId) {
    page.drawText(`USt-IdNr.: ${vatId}`, {
      x: margin,
      y: noteY,
      size: 8,
      font: helvetica,
      color: GRAY_TEXT,
    });
    noteY -= 11;
  }

  y -= 50;

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

  y -= 20;

  // --- PAYMENT INSTRUCTION ---
  const paymentDays = invoice.paymentDays ?? 14;
  page.drawText(
    `Bitte überweisen Sie den Gesamtbetrag von ${formatEur(grossAmount)} innerhalb von ${paymentDays} Tagen`,
    { x: margin, y, size: 9, font: helvetica, color: DARK_BLUE },
  );
  y -= 13;
  page.drawText(
    `auf das oben genannte Konto. Verwendungszweck: ${invoice.invoiceNumber}`,
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

  // Helper to format EUR amounts
  const formatEur = (amount: number) => {
    return amount.toFixed(2).replace('.', ',') + ' EUR';
  };

  // Helper to format date as DD.MM.YYYY
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  // Right-align helper
  const drawRightAligned = (
    text: string,
    xRight: number,
    yPos: number,
    font: PDFFont,
    size: number,
    color = DARK_BLUE,
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - textWidth, y: yPos, size, font, color });
  };

  // --- Helpers for wrapping text ---
  const drawWrappedText = (
    text: string,
    x: number,
    yStart: number,
    maxWidth: number,
    font: PDFFont,
    size: number,
    color = DARK_BLUE,
    lineHeight = 14,
  ): number => {
    const words = text.split(' ');
    let line = '';
    let currentY = yStart;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= lineHeight;
    }
    return currentY;
  };

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
    `Datum: ${formatDate(today)}`,
    metaX,
    y + 4,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
    `Bezug: Rechnung Nr. ${invoice.invoiceNumber}`,
    metaX,
    y - 10,
    helvetica,
    metaSize,
    GRAY_TEXT,
  );
  drawRightAligned(
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
      y = drawWrappedText(line, margin, y, maxTextWidth, helvetica, 9, DARK_BLUE, 14);
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
  drawRightAligned('Betrag', tableX + tableWidth - 8, y - headerHeight + 9, helveticaBold, 9, WHITE);

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
