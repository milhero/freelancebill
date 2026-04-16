import type { PDFDocument, PDFPage, PDFFont, RGB } from 'pdf-lib';

export interface PdfTemplateContext {
  doc: PDFDocument;
  page: PDFPage;
  invoice: any;
  client: any;
  settings: any;
  options: {
    showVatNote?: boolean;
    taxMode?: string;
    taxRate?: number;
    taxId?: string | null;
    vatId?: string | null;
  };
  accentColor: RGB;
  grayColor: RGB;
  lightGrayBg: RGB;
  fonts: { regular: PDFFont; bold: PDFFont };
  margin: number;
  width: number;
  height: number;
}

export type PdfTemplateFunction = (ctx: PdfTemplateContext) => void | Promise<void>;
