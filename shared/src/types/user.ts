export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export type TaxMode = 'kleinunternehmer' | 'regelbesteuerung';

export interface Settings {
  id: string;
  userId: string;
  fullName: string;
  addressStreet: string;
  addressZip: string;
  addressCity: string;
  email: string;
  phone: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  taxFreeAllowance: number;
  defaultPaymentDays: number;
  defaultHourlyRate: number;
  language: 'de' | 'en';
  taxMode: TaxMode;
  taxRate: number;
  taxId: string | null;
  vatId: string | null;
  invoiceTemplate: string;
  invoiceAccentColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsUpdate {
  fullName?: string;
  addressStreet?: string;
  addressZip?: string;
  addressCity?: string;
  email?: string;
  phone?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  taxFreeAllowance?: number;
  defaultPaymentDays?: number;
  defaultHourlyRate?: number;
  language?: 'de' | 'en';
  taxMode?: TaxMode;
  taxRate?: number;
  taxId?: string | null;
  vatId?: string | null;
  invoiceTemplate?: string;
  invoiceAccentColor?: string;
}
