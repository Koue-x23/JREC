import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AllData,
  BillingStatement,
  BusinessSettings,
  Customer,
  Invoice,
  Job,
  Payment,
  Quotation,
  ServiceReport,
} from '../lib/types'
import { getStore } from '../lib/storage'
import { deriveInvoice } from '../lib/compute'
import { addDays, todayStr, uid } from '../lib/format'
import { buildStatementEntries, type StatementInput } from '../lib/selectors'
import type { Store } from '../lib/storage/types'

// ── Input shapes (no ids/numbers — those are allocated by the system) ───────

export type CustomerInput = Omit<Customer, 'id' | 'code' | 'created_at'>
export type QuotationInput = Omit<Quotation, 'id' | 'number' | 'created_at'>
export type JobInput = Omit<Job, 'id' | 'number' | 'created_at'>
export type ServiceReportInput = Omit<ServiceReport, 'id' | 'number' | 'created_at'>
export type InvoiceInput = Omit<Invoice, 'id' | 'number' | 'created_at' | 'status'>
export type PaymentInput = Omit<Payment, 'id' | 'number' | 'created_at'>

interface DataContextValue {
  data: AllData
  loading: boolean
  error: string | null
  store: Store
  refresh: () => Promise<void>
  // customers
  createCustomer: (input: CustomerInput) => Promise<Customer>
  updateCustomer: (id: string, patch: Partial<CustomerInput>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  // quotations
  createQuotation: (input: QuotationInput) => Promise<Quotation>
  updateQuotation: (id: string, patch: Partial<QuotationInput>) => Promise<void>
  duplicateQuotation: (id: string) => Promise<Quotation>
  setQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>
  deleteQuotation: (id: string) => Promise<void>
  // jobs
  createJob: (input: JobInput) => Promise<Job>
  updateJob: (id: string, patch: Partial<JobInput>) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  // service reports
  createServiceReport: (input: ServiceReportInput) => Promise<ServiceReport>
  updateServiceReport: (id: string, patch: Partial<ServiceReportInput>) => Promise<void>
  deleteServiceReport: (id: string) => Promise<void>
  // invoices
  createInvoice: (input: InvoiceInput) => Promise<Invoice>
  updateInvoice: (id: string, patch: Partial<InvoiceInput>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  // payments
  createPayment: (input: PaymentInput) => Promise<Payment>
  updatePayment: (id: string, patch: Partial<PaymentInput>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  // statements
  generateStatement: (input: StatementInput) => Promise<BillingStatement>
  deleteStatement: (id: string) => Promise<void>
  // settings + data management
  saveSettings: (settings: BusinessSettings) => Promise<void>
  clearAllData: () => Promise<void>
  resetToSample: () => Promise<void>
  exportBackup: () => string
  importBackup: (json: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

const EMPTY_DATA: AllData = {
  customers: [],
  quotations: [],
  jobs: [],
  service_reports: [],
  invoices: [],
  payments: [],
  statements: [],
  settings: {
    business_name: 'JREC Stainless Steel Fabrication',
    address: 'R. Castillo St., Agdao, Davao City, Philippines 8000',
    phone: '0910 232 4612',
    email: '',
    logo: '',
    tax_rate: 0,
    quotation_valid_days: 30,
    invoice_due_days: 15,
    quotation_terms: '',
    invoice_notes: '',
    sequences: {
      CUST: { prefix: 'CUST', next: 1 },
      QUO: { prefix: 'QUO', next: 1 },
      JOB: { prefix: 'JOB', next: 1 },
      SR: { prefix: 'SR', next: 1 },
      INV: { prefix: 'INV', next: 1 },
      PAY: { prefix: 'PAY', next: 1 },
      BS: { prefix: 'BS', next: 1 },
    },
  },
}

export function DataProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), [])
  const [data, setData] = useState<AllData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const all = await store.loadAll()
      setData(all)
      setError(null)
      // Keep stored statuses in sync with derived ones (payments/due dates change).
      syncStoredStatuses(store, all).catch(() => undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load business records.')
    }
  }, [store])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await store.init()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to initialize storage.')
      }
      if (!cancelled) {
        await load()
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [store, load])

  const mutate = useCallback(
    async (fn: () => void | Promise<void>) => {
      await fn()
      await load()
    },
    [load],
  )

  // ── customers ──────────────────────────────────────────────────────────────
  const createCustomer = useCallback(
    (input: CustomerInput): Promise<Customer> => {
      const row: Customer = {
        ...input,
        id: uid(),
        code: '',
        created_at: new Date().toISOString(),
      }
      return mutate(async () => {
        row.code = await store.nextNumber('CUST')
        await store.insert('customers', row)
      }).then(() => row)
    },
    [mutate, store],
  )

  const updateCustomer = useCallback(
    (id: string, patch: Partial<CustomerInput>) =>
      mutate(async () => {
        await store.update('customers', id, patch)
      }),
    [mutate, store],
  )

  const deleteCustomer = useCallback(
    (id: string) => mutate(() => store.remove('customers', id)),
    [mutate, store],
  )

  // ── quotations ─────────────────────────────────────────────────────────────
  const createQuotation = useCallback(
    (input: QuotationInput): Promise<Quotation> => {
      const row: Quotation = {
        ...input,
        id: uid(),
        number: '',
        created_at: new Date().toISOString(),
      }
      return mutate(async () => {
        row.number = await store.nextNumber('QUO')
        await store.insert('quotations', row)
      }).then(() => row)
    },
    [mutate, store],
  )

  const updateQuotation = useCallback(
    (id: string, patch: Partial<QuotationInput>) =>
      mutate(async () => {
        await store.update('quotations', id, patch)
      }),
    [mutate, store],
  )

  const duplicateQuotation = useCallback(
    async (id: string): Promise<Quotation> => {
      const src = data.quotations.find((q) => q.id === id)
      if (!src) throw new Error('Quotation not found.')
      const today = todayStr()
      const row: Quotation = {
        ...src,
        id: uid(),
        number: '',
        date: today,
        valid_until: addDays(today, data.settings.quotation_valid_days),
        items: src.items.map((it) => ({ ...it, id: uid() })),
        status: 'Draft',
        notes: src.notes,
        created_at: new Date().toISOString(),
      }
      await mutate(async () => {
        row.number = await store.nextNumber('QUO')
        await store.insert('quotations', row)
      })
      return row
    },
    [data.quotations, data.settings.quotation_valid_days, mutate, store],
  )

  const setQuotationStatus = useCallback(
    (id: string, status: Quotation['status']) =>
      mutate(async () => {
        await store.update('quotations', id, { status })
      }),
    [mutate, store],
  )

  const deleteQuotation = useCallback(
    (id: string) => mutate(() => store.remove('quotations', id)),
    [mutate, store],
  )

  // ── jobs ───────────────────────────────────────────────────────────────────
  const createJob = useCallback(
    (input: JobInput): Promise<Job> => {
      const row: Job = { ...input, id: uid(), number: '', created_at: new Date().toISOString() }
      return mutate(async () => {
        row.number = await store.nextNumber('JOB')
        await store.insert('jobs', row)
      }).then(() => row)
    },
    [mutate, store],
  )

  const updateJob = useCallback(
    (id: string, patch: Partial<JobInput>) => mutate(async () => {
        await store.update('jobs', id, patch)
      }),
    [mutate, store],
  )

  const deleteJob = useCallback(
    (id: string) => mutate(() => store.remove('jobs', id)),
    [mutate, store],
  )

  // ── service reports ────────────────────────────────────────────────────────
  const createServiceReport = useCallback(
    (input: ServiceReportInput): Promise<ServiceReport> => {
      const row: ServiceReport = {
        ...input,
        id: uid(),
        number: '',
        created_at: new Date().toISOString(),
      }
      return mutate(async () => {
        row.number = await store.nextNumber('SR')
        await store.insert('service_reports', row)
      }).then(() => row)
    },
    [mutate, store],
  )

  const updateServiceReport = useCallback(
    (id: string, patch: Partial<ServiceReportInput>) =>
      mutate(async () => {
        await store.update('service_reports', id, patch)
      }),
    [mutate, store],
  )

  const deleteServiceReport = useCallback(
    (id: string) => mutate(() => store.remove('service_reports', id)),
    [mutate, store],
  )

  // ── invoices ───────────────────────────────────────────────────────────────
  const createInvoice = useCallback(
    (input: InvoiceInput): Promise<Invoice> => {
      const row: Invoice = {
        ...input,
        id: uid(),
        number: '',
        status: 'Unpaid',
        created_at: new Date().toISOString(),
      }
      return mutate(async () => {
        row.number = await store.nextNumber('INV')
        await store.insert('invoices', row)
      }).then(() => row)
    },
    [mutate, store],
  )

  const updateInvoice = useCallback(
    (id: string, patch: Partial<InvoiceInput>) =>
      mutate(async () => {
        await store.update('invoices', id, patch)
      }),
    [mutate, store],
  )

  const deleteInvoice = useCallback(
    (id: string) => mutate(() => store.remove('invoices', id)),
    [mutate, store],
  )

  // ── payments ───────────────────────────────────────────────────────────────
  const refreshInvoiceStatus = useCallback(
    async (invoiceId: string, current: AllData) => {
      const inv = current.invoices.find((i) => i.id === invoiceId)
      if (!inv) return
      const derived = deriveInvoice(inv, current.payments)
      if (derived.status !== inv.status) {
        await store.update('invoices', invoiceId, { status: derived.status })
      }
    },
    [store],
  )

  const createPayment = useCallback(
    (input: PaymentInput): Promise<Payment> => {
      const row: Payment = {
        ...input,
        id: uid(),
        number: '',
        created_at: new Date().toISOString(),
      }
      return mutate(async () => {
        row.number = await store.nextNumber('PAY')
        await store.insert('payments', row)
        await refreshInvoiceStatus(input.invoice_id, {
          ...data,
          payments: [...data.payments, row],
        })
      }).then(() => row)
    },
    [data, mutate, refreshInvoiceStatus, store],
  )

  const updatePayment = useCallback(
    (id: string, patch: Partial<PaymentInput>) =>
      mutate(async () => {
        const before = data.payments.find((p) => p.id === id)
        await store.update('payments', id, patch)
        const after = data.payments.map((p) => (p.id === id ? { ...p, ...patch } : p))
        const touched = new Set<string>()
        if (before?.invoice_id) touched.add(before.invoice_id)
        if (patch.invoice_id) touched.add(patch.invoice_id)
        for (const invId of touched) await refreshInvoiceStatus(invId, { ...data, payments: after })
      }),
    [data, mutate, refreshInvoiceStatus, store],
  )

  const deletePayment = useCallback(
    (id: string) =>
      mutate(async () => {
        const before = data.payments.find((p) => p.id === id)
        await store.remove('payments', id)
        if (before) {
          await refreshInvoiceStatus(
            before.invoice_id,
            { ...data, payments: data.payments.filter((p) => p.id !== id) },
          )
        }
      }),
    [data, mutate, refreshInvoiceStatus, store],
  )

  // ── billing statements ─────────────────────────────────────────────────────
  const generateStatement = useCallback(
    async (input: StatementInput): Promise<BillingStatement> => {
      const built = buildStatementEntries(data, input)
      const row: BillingStatement = {
        id: uid(),
        number: '',
        date: todayStr(),
        customer_id: input.customerId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        previous_balance: built.previousBalance,
        adjustments: built.adjustments,
        current_balance: built.currentBalance,
        entries: built.entries,
        notes: input.notes,
        created_at: new Date().toISOString(),
      }
      await mutate(async () => {
        row.number = await store.nextNumber('BS')
        await store.insert('billing_statements', row)
      })
      return row
    },
    [data, mutate, store],
  )

  const deleteStatement = useCallback(
    (id: string) => mutate(() => store.remove('billing_statements', id)),
    [mutate, store],
  )

  // ── settings / data management ─────────────────────────────────────────────
  const saveSettings = useCallback(
    async (settings: BusinessSettings) => {
      await store.saveSettings(settings)
      await load()
    },
    [load, store],
  )

  const clearAllData = useCallback(async () => {
    await store.clearAll()
    await load()
  }, [load, store])

  const resetToSample = useCallback(async () => {
    await store.resetToSample()
    await load()
  }, [load, store])

  const exportBackup = useCallback(
    () =>
      JSON.stringify(
        { app: 'JREC Manager', version: 1, exported_at: new Date().toISOString(), ...data },
        null,
        2,
      ),
    [data],
  )

  const importBackup = useCallback(
    async (json: string) => {
      const parsed = JSON.parse(json) as Partial<AllData> & { app?: string }
      const payload = {
        customers: parsed.customers ?? [],
        quotations: parsed.quotations ?? [],
        jobs: parsed.jobs ?? [],
        service_reports: parsed.service_reports ?? [],
        invoices: parsed.invoices ?? [],
        payments: parsed.payments ?? [],
        statements: parsed.statements ?? [],
      }
      if (payload.customers.length === 0 && payload.invoices.length === 0) {
        throw new Error('Backup file contains no business records.')
      }
      await store.importAll(payload)
      await load()
    },
    [load, store],
  )

  const value: DataContextValue = {
    data,
    loading,
    error,
    store,
    refresh: load,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createQuotation,
    updateQuotation,
    duplicateQuotation,
    setQuotationStatus,
    deleteQuotation,
    createJob,
    updateJob,
    deleteJob,
    createServiceReport,
    updateServiceReport,
    deleteServiceReport,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createPayment,
    updatePayment,
    deletePayment,
    generateStatement,
    deleteStatement,
    saveSettings,
    clearAllData,
    resetToSample,
    exportBackup,
    importBackup,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/** Persist derived statuses (invoice payment status) without a reload loop. */
async function syncStoredStatuses(store: Store, all: AllData) {
  for (const inv of all.invoices) {
    const derived = deriveInvoice(inv, all.payments)
    if (derived.status !== inv.status) {
      await store.update('invoices', inv.id, { status: derived.status }).catch(() => undefined)
    }
  }
}

