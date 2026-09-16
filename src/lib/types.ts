// ─────────────────────────────────────────────────────────────────────────────
// JREC Stainless Steel Fabrication — Domain Types
// All business records for the management system.
// ─────────────────────────────────────────────────────────────────────────────

export type ID = string

export interface Customer {
  id: ID
  code: string // CUST-00001
  name: string
  company: string
  phone: string
  email: string
  address: string
  contact_person: string
  notes: string
  date_added: string // YYYY-MM-DD
  created_at: string // ISO
}

export type QuotationStatus =
  | 'Draft'
  | 'Sent'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Expired'

export interface LineItem {
  id: ID
  description: string
  quantity: number
  unit: string
  unit_price: number
}

export interface Quotation {
  id: ID
  number: string // QUO-00001
  date: string // YYYY-MM-DD
  valid_until: string
  customer_id: ID
  project_name: string
  description: string
  items: LineItem[]
  discount: number
  tax_rate: number // percent
  notes: string
  terms: string
  status: QuotationStatus
  created_at: string
}

export type JobStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'

export interface Job {
  id: ID
  number: string // JOB-00001
  customer_id: ID
  quotation_id: ID | null
  project_name: string
  description: string
  start_date: string
  expected_completion: string
  actual_completion: string
  fabricator: string
  status: JobStatus
  notes: string
  created_at: string
}

export type ServiceStatus = 'Pending' | 'In Progress' | 'Completed'

export interface ServiceReport {
  id: ID
  number: string // SR-00001
  service_date: string
  customer_id: ID
  location: string
  job_id: ID | null
  item_product: string
  problem_request: string
  work_performed: string
  materials_used: string
  status: ServiceStatus
  technician: string
  remarks: string
  acknowledged_by: string
  acknowledged_at: string
  created_at: string
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'GCash' | 'Other'

export type InvoiceStatusValue = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue'

export interface Invoice {
  id: ID
  number: string // INV-00001
  invoice_date: string
  due_date: string
  customer_id: ID
  job_id: ID | null
  project_name: string
  items: LineItem[]
  discount: number
  tax_rate: number
  notes: string
  status: InvoiceStatusValue // stored; recomputed whenever payments change
  created_at: string
}

export interface Payment {
  id: ID
  number: string // PAY-00001
  date: string
  customer_id: ID
  invoice_id: ID
  amount: number
  method: PaymentMethod
  reference: string
  notes: string
  created_at: string
}

export type StatementEntryKind = 'Previous Balance' | 'Invoice' | 'Payment' | 'Adjustment'

export interface StatementEntry {
  kind: StatementEntryKind
  date: string
  ref: string
  description: string
  amount: number // positive = charge, negative = credit
}

export interface BillingStatement {
  id: ID
  number: string // BS-00001
  date: string
  customer_id: ID
  period_start: string
  period_end: string
  previous_balance: number
  adjustments: number
  current_balance: number
  entries: StatementEntry[]
  notes: string
  created_at: string
}

export type SequenceKey = 'CUST' | 'QUO' | 'JOB' | 'SR' | 'INV' | 'PAY' | 'BS'

export interface SequenceDef {
  prefix: string
  next: number
}

export type Sequences = Record<SequenceKey, SequenceDef>

export interface BusinessSettings {
  business_name: string
  address: string
  phone: string
  email: string
  logo: string // data URL ('' = use built-in mark)
  tax_rate: number
  quotation_valid_days: number
  invoice_due_days: number
  quotation_terms: string
  invoice_notes: string
  sequences: Sequences
}

export interface AllData {
  customers: Customer[]
  quotations: Quotation[]
  jobs: Job[]
  service_reports: ServiceReport[]
  invoices: Invoice[]
  payments: Payment[]
  statements: BillingStatement[]
  settings: BusinessSettings
}

export type TableName =
  | 'customers'
  | 'quotations'
  | 'jobs'
  | 'service_reports'
  | 'invoices'
  | 'payments'
  | 'billing_statements'

export const DEFAULT_SEQUENCES: Sequences = {
  CUST: { prefix: 'CUST', next: 1 },
  QUO: { prefix: 'QUO', next: 1 },
  JOB: { prefix: 'JOB', next: 1 },
  SR: { prefix: 'SR', next: 1 },
  INV: { prefix: 'INV', next: 1 },
  PAY: { prefix: 'PAY', next: 1 },
  BS: { prefix: 'BS', next: 1 },
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: 'JREC Stainless Steel Fabrication',
  address: 'R. Castillo St., Agdao, Davao City, Philippines 8000',
  phone: '0910 232 4612',
  email: '',
  logo: '',
  tax_rate: 0,
  quotation_valid_days: 30,
  invoice_due_days: 15,
  quotation_terms:
    '1. Prices are valid until the date indicated above.\n2. 50% down payment is required before work begins; balance is due upon completion.\n3. Price covers materials and labor as described. Any change of specification may incur additional charges.\n4. Production lead time starts upon receipt of down payment.\n5. Warranty covers workmanship for thirty (30) days from completion.',
  invoice_notes:
    'Please make payment on or before the due date. Kindly reference the invoice number when paying.',
  sequences: DEFAULT_SEQUENCES,
}

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'Draft',
  'Sent',
  'Pending',
  'Approved',
  'Rejected',
  'Expired',
]

export const JOB_STATUSES: JobStatus[] = [
  'Pending',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
]

export const SERVICE_STATUSES: ServiceStatus[] = ['Pending', 'In Progress', 'Completed']

export const INVOICE_STATUSES: InvoiceStatusValue[] = [
  'Unpaid',
  'Partially Paid',
  'Paid',
  'Overdue',
]

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'GCash', 'Other']

export const COMMON_UNITS = [
  'pcs',
  'set',
  'lot',
  'sq.m.',
  'sq.ft.',
  'ltr.',
  'm',
  'ft.',
  'kg',
  'box',
  'hr',
  'day',
]
