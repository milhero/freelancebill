import type { PDFPage, PDFFont, RGB } from 'pdf-lib';

/** Format a number as "1.234,56 EUR" */
export function formatEur(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' EUR';
}

/** Format an ISO date string as DD.MM.YYYY */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

/** Convert a hex color string (e.g. "#1a1a2e") to {r, g, b} normalized 0-1 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/** Draw text right-aligned at a given x boundary */
export function drawRightAligned(
  page: PDFPage,
  text: string,
  xRight: number,
  yPos: number,
  font: PDFFont,
  size: number,
  color: RGB,
): void {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - textWidth, y: yPos, size, font, color });
}

/** Draw wrapped text within a max width. Returns the new y position after drawing. */
export function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color: RGB,
  lineHeight = 14,
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

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
}

/** Resolve tax calculation values from context */
export function calcTax(
  totalAmount: number,
  taxMode: string,
  taxRate: number,
): { netAmount: number; taxAmount: number; grossAmount: number; isRegelbesteuerung: boolean } {
  const isRegelbesteuerung = taxMode === 'regelbesteuerung';
  const netAmount = totalAmount;
  const taxAmount = isRegelbesteuerung ? Math.round(netAmount * taxRate) / 100 : 0;
  const grossAmount = netAmount + taxAmount;
  return { netAmount, taxAmount, grossAmount, isRegelbesteuerung };
}

/** Parse a potentially string amount to number */
export function toNum(val: any): number {
  return typeof val === 'number' ? val : parseFloat(val || '0');
}
