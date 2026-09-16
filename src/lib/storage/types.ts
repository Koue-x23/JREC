import type {
  AllData,
  BillingStatement,
  BusinessSettings,
  Customer,
  Invoice,
  Job,
  Payment,
  Quotation,
  SequenceKey,
  ServiceReport,
  TableName,
} from '../types'

/** Maps storage tables to their domain row types. */
export interface TableMap {
  customers: Customer
  quotations: Quotation
  jobs: Job
  service_reports: ServiceReport
  invoices: Invoice
  payments: Payment
  billing_statements: BillingStatement
}

export interface Store {
  readonly kind: 'local' | 'supabase'
  readonly label: string
  /** Ensure settings/sequence rows exist (and seed sample data on local). */
  init(): Promise<void>
  loadAll(): Promise<AllData>
  insert<T extends TableName>(table: T, row: TableMap[T]): Promise<TableMap[T]>
  update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>): Promise<TableMap[T]>
  remove(table: TableName, id: string): Promise<void>
  /** Atomically allocate the next document number, e.g. QUO-00042. */
  nextNumber(key: SequenceKey): Promise<string>
  getSettings(): Promise<BusinessSettings>
  saveSettings(settings: BusinessSettings): Promise<void>
  /** Delete every business record (customers, documents, payments, statements). */
  clearAll(): Promise<void>
  /** Clear everything and load the built-in sample dataset. */
  resetToSample(): Promise<void>
  /** Replace all records with a backup payload. */
  importAll(data: Omit<AllData, 'settings'>): Promise<void>
}
