export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiError {
  error: string;
  statusCode: number;
}

export interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  profitLoss: number;
  openInvoicesCount: number;
  openInvoicesTotal: number;
  taxFreeRemaining: number;
  overdueInvoices: OverdueInvoice[];
  monthlyData: MonthlyData[];
  yearComparison: YearComparison;
  topClients: TopClient[];
  agingReport: AgingReport;
}

export interface YearComparison {
  currentYear: { revenue: number; expenses: number; profit: number };
  previousYear: { revenue: number; expenses: number; profit: number };
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
}

export interface TopClient {
  clientId: string;
  clientName: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface AgingBucket {
  count: number;
  total: number;
}

export interface AgingReport {
  current: AgingBucket;
  days30: AgingBucket;
  days60: AgingBucket;
  days90: AgingBucket;
  days90plus: AgingBucket;
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  paymentDueDate: string;
  daysSinceDue: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ClientStatsInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  description: string | null;
}

export interface ClientStatsProject {
  id: string;
  name: string;
  status: string;
}

export interface ClientMonthlyRevenue {
  month: number;
  revenue: number;
}

export interface ClientStatsData {
  totalRevenue: number;
  openInvoicesCount: number;
  openInvoicesTotal: number;
  paidInvoicesCount: number;
  averageInvoiceAmount: number;
  monthlyRevenue: ClientMonthlyRevenue[];
  invoices: ClientStatsInvoice[];
  projects: ClientStatsProject[];
}

export interface ProjectStatsData {
  totalRevenue: number;
  totalExpenses: number;
  profitLoss: number;
  invoiceCount: number;
  invoices: ClientStatsInvoice[];
  clientName: string | null;
}
