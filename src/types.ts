export enum UserRole {
  Admin = "admin"
}

export interface UserSession {
  username: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export interface Buyer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  status: "active" | "inactive";
  balance: number; // Positive means buyer owes money to the business
}

export interface BuyerLedgerEntry {
  id: string;
  buyerId: string;
  date: string;
  type: "invoice" | "payment" | "opening";
  referenceId: string; // invoiceId or paymentId
  amount: number;
  description: string;
  balanceAfter: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  status: "active" | "inactive";
  outstandingPayable: number; // Positive means business owes money to supplier
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  date: string;
  type: "purchase" | "payment" | "opening";
  referenceId: string;
  amount: number;
  description: string;
  balanceAfter: number;
}

export interface Material {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  defaultPurchaseRate: number;
  defaultSalesRate: number;
  minStockLevel: number;
  currentStock: number;
}

export interface StockAdjustment {
  id: string;
  materialId: string;
  date: string;
  type: "add" | "remove" | "reconcile";
  quantity: number;
  description: string;
}

export interface QuoteItem {
  materialId: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  buyerId: string;
  date: string;
  dueDate: string;
  items: QuoteItem[];
  status: "draft" | "sent" | "approved" | "declined" | "converted";
  subtotal: number;
  taxAmount: number;
  total: number;
  convertedInvoiceId?: string;
  notes?: string;
}

export interface InvoiceItem {
  materialId: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  transportation_amount?: number;
  transport_supplier_id?: string | null;
  transportation_notes?: string;
  purchase_rate?: number;
  selling_rate?: number;
  profit?: number;
  margin_percentage?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  transportationAmount?: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other";
  referenceNo?: string;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  fileType: string;
  size: number;
  base64Data: string; // stored inline for simple portable backups
  uploadedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  buyerId: string;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  status: "unpaid" | "partial" | "paid";
  subtotal: number;
  taxAmount: number;
  total: number;
  balanceDue: number;
  payments: Payment[];
  attachments: Attachment[];
  notes?: string;
  transport?: {
    supplierId: string | null;
    amount: number;
    notes: string;
  };
}

export interface DashboardNote {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isCompleted: boolean;
  reminderDate?: string; // ISO string or simple date
  category: "General" | "Follow-up" | "Order" | "Billing";
  createdAt: string;
}

export interface BusinessSettings {
  companyName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  gstIn: string;
  defaultGstRate: number; // e.g., 18 for 18%
  currency: string; // e.g., "INR" or "₹"
  upiId?: string;
  qrCodeUrl?: string;
  invoiceFooter?: string;
  termsConditions?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  details: string;
  referenceId?: string;
}
