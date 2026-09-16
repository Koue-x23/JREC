import type {
  AllData,
  BillingStatement,
  Customer,
  Invoice,
  Job,
  Payment,
  Quotation,
  ServiceReport,
} from './types'
import { computeTotals, deriveInvoice } from './compute'
import { addMonths, monthLabel, parseDay, round2, todayStr, toDayStr } from './format'
import { quotationStatusOf } from './compute'

export interface InvoiceView extends Invoice {
  customer_name: string
  paid: number
  balance: number
  status: Invoice['status']
  daysOverdue: number
  total: number
}

/** Invoices joined with customer + computed payment state. */
export function invoiceViews(data: AllData, onDay: string = todayStr()): InvoiceView[] {
  const byCustomer = new Map(data.customers.map((c) => [c.id, c]))
  return data.invoices.map((inv) => {
    const d = deriveInvoice(inv, data.payments, onDay)
    return {
      ...inv,
      customer_name: byCustomer.get(inv.customer_id)?.name ?? 'Unknown customer',
      paid: d.paid,
      balance: d.balance,
      status: d.status,
      daysOverdue: d.daysOverdue,
      total: d.total,
    }
  })
}

export interface CustomerStats {
  quotationCount: number
  jobCount: number
  serviceReportCount: number
  invoiceCount: number
  paymentCount: number
  statementCount: number
  totalSales: number
  totalPaid: number
  outstanding: number
  lastActivity: string
}

export function customerStats(data: AllData, customerId: string): CustomerStats {
  const onDay = todayStr()
  const invs = data.invoices.filter((i) => i.customer_id === customerId)
  const pays = data.payments.filter((p) => p.customer_id === customerId)
  const views = invoiceViews(data, onDay).filter((v) => v.customer_id === customerId)
  const totalSales = round2(views.reduce((s, v) => s + v.total, 0))
  const totalPaid = round2(pays.reduce((s, p) => s + p.amount, 0))
  const outstanding = round2(views.reduce((s, v) => s + v.balance, 0))
  const dates = [
    ...data.quotations.filter((q) => q.customer_id === customerId).map((q) => q.date),
    ...data.jobs.filter((j) => j.customer_id === customerId).map((j) => j.start_date),
    ...data.service_reports.filter((r) => r.customer_id === customerId).map((r) => r.service_date),
    ...invs.map((i) => i.invoice_date),
    ...pays.map((p) => p.date),
    ...data.statements.filter((b) => b.customer_id === customerId).map((b) => b.date),
  ].filter(Boolean)
  dates.sort()
  return {
    quotationCount: data.quotations.filter((q) => q.customer_id === customerId).length,
    jobCount: data.jobs.filter((j) => j.customer_id === customerId).length,
    serviceReportCount: data.service_reports.filter((r) => r.customer_id === customerId).length,
    invoiceCount: invs.length,
    paymentCount: pays.length,
    statementCount: data.statements.filter((b) => b.customer_id === customerId).length,
    totalSales,
    totalPaid,
    outstanding,
    lastActivity: dates.length ? dates[dates.length - 1] : '',
  }
}

export interface DashboardStats {
  totalCustomers: number
  activeJobs: number
  jobsOnHold: number
  pendingQuotations: number
  approvedQuotations: number
  unpaidInvoicesCount: number
  unpaidInvoicesAmount: number
  overdueInvoicesCount: number
  overdueInvoicesAmount: number
  totalPayments: number
  paymentsThisMonth: number
  salesThisMonth: number
  outstandingBalance: number
}

export function dashboardStats(data: AllData, onDay: string = todayStr()): DashboardStats {
  const views = invoiceViews(data, onDay)
  const unpaid = views.filter((v) => v.balance > 0.005 && v.status !== 'Overdue')
  const overdue = views.filter((v) => v.status === 'Overdue')
  const month = onDay.slice(0, 7)
  const quotations = data.quotations.map((q) => ({ ...q, status: quotationStatusOf(q, onDay) }))
  return {
    totalCustomers: data.customers.length,
    activeJobs: data.jobs.filter((j) => j.status === 'Pending' || j.status === 'In Progress').length,
    jobsOnHold: data.jobs.filter((j) => j.status === 'On Hold').length,
    pendingQuotations: quotations.filter((q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Pending').length,
    approvedQuotations: quotations.filter((q) => q.status === 'Approved').length,
    unpaidInvoicesCount: unpaid.length,
    unpaidInvoicesAmount: round2(unpaid.reduce((s, v) => s + v.balance, 0)),
    overdueInvoicesCount: overdue.length,
    overdueInvoicesAmount: round2(overdue.reduce((s, v) => s + v.balance, 0)),
    totalPayments: round2(data.payments.reduce((s, p) => s + p.amount, 0)),
    paymentsThisMonth: round2(
      data.payments.filter((p) => p.date.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0),
    ),
    salesThisMonth: round2(
      views.filter((v) => v.invoice_date.slice(0, 7) === month).reduce((s, v) => s + v.total, 0),
    ),
    outstandingBalance: round2(views.reduce((s, v) => s + v.balance, 0)),
  }
}

export interface MonthPoint {
  key: string // 2026-09
  label: string // Sep
  sales: number
  payments: number
}

export function monthlySeries(data: AllData, months: number, onDay: string = todayStr()): MonthPoint[] {
  const views = invoiceViews(data, onDay)
  const points: MonthPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const ym = addMonths(`${onDay.slice(0, 7)}-01`, -i).slice(0, 7)
    points.push({
      key: ym,
      label: monthLabel(ym),
      sales: round2(views.filter((v) => v.invoice_date.slice(0, 7) === ym).reduce((s, v) => s + v.total, 0)),
      payments: round2(
        data.payments.filter((p) => p.date.slice(0, 7) === ym).reduce((s, p) => s + p.amount, 0),
      ),
    })
  }
  return points
}

export interface AgingBucket {
  label: string
  amount: number
  count: number
}

export function receivablesAging(data: AllData, onDay: string = todayStr()): AgingBucket[] {
  const views = invoiceViews(data, onDay).filter((v) => v.balance > 0.005)
  const buckets: AgingBucket[] = [
    { label: 'Current', amount: 0, count: 0 },
    { label: '1–30 days', amount: 0, count: 0 },
    { label: '31–60 days', amount: 0, count: 0 },
    { label: '60+ days', amount: 0, count: 0 },
  ]
  const today = parseDay(onDay).getTime()
  for (const v of views) {
    const overdueDays = Math.floor((today - parseDay(v.due_date).getTime()) / 86_400_000)
    const idx = overdueDays <= 0 ? 0 : overdueDays <= 30 ? 1 : overdueDays <= 60 ? 2 : 3
    buckets[idx].amount = round2(buckets[idx].amount + v.balance)
    buckets[idx].count += 1
  }
  return buckets
}

export function countByStatus<T extends { status: string }>(rows: T[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1)
  return [...map.entries()].map(([label, value]) => ({ label, value }))
}

// ── Billing statement generation ─────────────────────────────────────────────

export interface StatementInput {
  customerId: string
  periodStart: string
  periodEnd: string
  adjustments: { description: string; amount: number }[]
  notes: string
}

export function buildStatementEntries(
  data: AllData,
  input: StatementInput,
): {
  entries: import('./types').StatementEntry[]
  previousBalance: number
  adjustments: number
  currentBalance: number
} {
  const invs = invoiceViews(data)
    .filter((v) => v.customer_id === input.customerId)
    .sort((a, b) => a.invoice_date.localeCompare(b.invoice_date))

  const previousInvoices = invs.filter((v) => v.invoice_date < input.periodStart)
  const previousBalance = round2(previousInvoices.reduce((s, v) => s + v.balance, 0))

  const periodInvoices = invs.filter(
    (v) => v.invoice_date >= input.periodStart && v.invoice_date <= input.periodEnd,
  )
  const periodPayments = data.payments
    .filter(
      (p) =>
        p.customer_id === input.customerId &&
        p.date >= input.periodStart &&
        p.date <= input.periodEnd,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const entries: import('./types').StatementEntry[] = []
  if (previousBalance !== 0) {
    entries.push({
      kind: 'Previous Balance',
      date: input.periodStart,
      ref: '—',
      description: 'Balance carried forward',
      amount: previousBalance,
    })
  }
  for (const v of periodInvoices) {
    entries.push({
      kind: 'Invoice',
      date: v.invoice_date,
      ref: v.number,
      description: v.project_name || 'Invoice',
      amount: v.total,
    })
  }
  for (const p of periodPayments) {
    const inv = data.invoices.find((i) => i.id === p.invoice_id)
    entries.push({
      kind: 'Payment',
      date: p.date,
      ref: p.number,
      description: `Payment received — ${p.method}${inv ? ` (applied to ${inv.number})` : ''}`,
      amount: -p.amount,
    })
  }
  for (const adj of input.adjustments) {
    if (adj.amount !== 0) {
      entries.push({
        kind: 'Adjustment',
        date: input.periodEnd,
        ref: '—',
        description: adj.description || 'Adjustment',
        amount: adj.amount,
      })
    }
  }

  const adjustments = round2(input.adjustments.reduce((s, a) => s + a.amount, 0))
  const charges = round2(entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0))
  const credits = round2(entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0))
  const currentBalance = round2(charges + credits)

  return { entries, previousBalance, adjustments, currentBalance }
}

// ── Recent activity ──────────────────────────────────────────────────────────

export interface RecentRow {
  id: string
  kind: 'quotation' | 'job' | 'service' | 'invoice' | 'payment'
  number: string
  title: string
  who: string
  date: string
  amount?: number
  status?: string
  to: string
}

export function recentActivity(data: AllData, kind: RecentRow['kind'], limit = 6): RecentRow[] {
  const cust = (id: string) => data.customers.find((c) => c.id === id)?.name ?? '—'
  const onDay = todayStr()
  const views = invoiceViews(data, onDay)
  let rows: RecentRow[] = []
  if (kind === 'quotation') {
    rows = data.quotations
      .slice()
      .sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at))
      .map((q) => ({
        id: q.id, kind, number: q.number, title: q.project_name, who: cust(q.customer_id),
        date: q.date, amount: computeTotals(q.items, q.discount, q.tax_rate).total,
        status: quotationStatusOf(q, onDay), to: `/quotations/${q.id}`,
      }))
  } else if (kind === 'job') {
    rows = data.jobs
      .slice()
      .sort((a, b) => (b.start_date + b.created_at).localeCompare(a.start_date + a.created_at))
      .map((j) => ({
        id: j.id, kind, number: j.number, title: j.project_name, who: cust(j.customer_id),
        date: j.start_date, status: j.status, to: `/jobs/${j.id}`,
      }))
  } else if (kind === 'service') {
    rows = data.service_reports
      .slice()
      .sort((a, b) => b.service_date.localeCompare(a.service_date))
      .map((s) => ({
        id: s.id, kind, number: s.number, title: s.item_product || s.problem_request, who: cust(s.customer_id),
        date: s.service_date, status: s.status, to: `/service-reports/${s.id}`,
      }))
  } else if (kind === 'invoice') {
    rows = views
      .slice()
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
      .map((v) => ({
        id: v.id, kind, number: v.number, title: v.project_name, who: v.customer_name,
        date: v.invoice_date, amount: v.total, status: v.status, to: `/invoices/${v.id}`,
      }))
  } else {
    rows = data.payments
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => {
        const inv = data.invoices.find((i) => i.id === p.invoice_id)
        return {
          id: p.id, kind, number: p.number, title: `${p.method} payment`, who: cust(p.customer_id),
          date: p.date, amount: p.amount, status: inv ? `for ${inv.number}` : '', to: `/payments`,
        }
      })
  }
  return rows.slice(0, limit)
}

// ── Reports ──────────────────────────────────────────────────────────────────

export type ReportGranularity = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'

export function groupKey(date: string, g: ReportGranularity): string {
  const d = parseDay(date)
  if (g === 'Daily') return date
  if (g === 'Monthly') return date.slice(0, 7)
  if (g === 'Yearly') return date.slice(0, 4)
  // Weekly: ISO-ish week starting Monday
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return toDayStr(d)
}

export function inRange(date: string, from: string, to: string): boolean {
  return (!from || date >= from) && (!to || date <= to)
}

export function filterByRangeAndCustomer<T extends { date: string; customer_id: string }>(
  rows: T[], from: string, to: string, customerId?: string,
): T[] {
  return rows.filter(
    (r) => inRange(r.date, from, to) && (!customerId || r.customer_id === customerId),
  )
}

export function salesReport(data: AllData, from: string, to: string, customerId: string | undefined, g: ReportGranularity) {
  const views = invoiceViews(data).filter(
    (v) => inRange(v.invoice_date, from, to) && (!customerId || v.customer_id === customerId),
  )
  const groups = new Map<string, { total: number; count: number }>()
  for (const v of views) {
    const k = groupKey(v.invoice_date, g)
    const cur = groups.get(k) ?? { total: 0, count: 0 }
    cur.total = round2(cur.total + v.total)
    cur.count += 1
    groups.set(k, cur)
  }
  const series = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, val]) => ({ key, ...val }))
  return {
    rows: views.slice().sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)),
    series,
    total: round2(views.reduce((s, v) => s + v.total, 0)),
    count: views.length,
    paid: round2(views.reduce((s, v) => s + v.paid, 0)),
    balance: round2(views.reduce((s, v) => s + v.balance, 0)),
  }
}

export function paymentReport(data: AllData, from: string, to: string, customerId: string | undefined, g: ReportGranularity) {
  const rows = data.payments
    .filter((p) => inRange(p.date, from, to) && (!customerId || p.customer_id === customerId))
    .sort((a, b) => b.date.localeCompare(a.date))
  const groups = new Map<string, number>()
  for (const p of rows) {
    const k = groupKey(p.date, g)
    groups.set(k, round2((groups.get(k) ?? 0) + p.amount))
  }
  const byMethod = new Map<string, number>()
  for (const p of rows) byMethod.set(p.method, round2((byMethod.get(p.method) ?? 0) + p.amount))
  return {
    rows,
    series: [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, total]) => ({ key, total })),
    byMethod: [...byMethod.entries()].map(([label, total]) => ({ label, total })),
    total: round2(rows.reduce((s, p) => s + p.amount, 0)),
    count: rows.length,
  }
}

export function outstandingReport(data: AllData) {
  return invoiceViews(data)
    .filter((v) => v.balance > 0.005)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export function overdueReport(data: AllData) {
  return invoiceViews(data)
    .filter((v) => v.status === 'Overdue')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export function customerReport(data: AllData, from: string, to: string) {
  const views = invoiceViews(data)
  return data.customers
    .map((c) => {
      const invs = views.filter(
        (v) => v.customer_id === c.id && inRange(v.invoice_date, from, to),
      )
      const pays = data.payments.filter((p) => p.customer_id === c.id && inRange(p.date, from, to))
      const stats = customerStats(data, c.id)
      return {
        customer: c,
        invoices: invs.length,
        sales: round2(invs.reduce((s, v) => s + v.total, 0)),
        payments: round2(pays.reduce((s, p) => s + p.amount, 0)),
        outstanding: stats.outstanding,
        lastActivity: stats.lastActivity,
      }
    })
    .sort((a, b) => b.sales - a.sales)
}

export interface EntityCounts {
  quotations: number
  jobs: number
  serviceReports: number
  invoices: number
  payments: number
  statements: number
}

export function relatedCounts(data: AllData, customerId: string): EntityCounts {
  return {
    quotations: data.quotations.filter((q) => q.customer_id === customerId).length,
    jobs: data.jobs.filter((j) => j.customer_id === customerId).length,
    serviceReports: data.service_reports.filter((r) => r.customer_id === customerId).length,
    invoices: data.invoices.filter((i) => i.customer_id === customerId).length,
    payments: data.payments.filter((p) => p.customer_id === customerId).length,
    statements: data.statements.filter((b) => b.customer_id === customerId).length,
  }
}

/** Guard used before deleting a customer. */
export function customerBlockers(data: AllData, customerId: string): string[] {
  const c = relatedCounts(data, customerId)
  const parts: string[] = []
  if (c.quotations) parts.push(`${c.quotations} quotation(s)`)
  if (c.jobs) parts.push(`${c.jobs} job(s)`)
  if (c.serviceReports) parts.push(`${c.serviceReports} service report(s)`)
  if (c.invoices) parts.push(`${c.invoices} invoice(s)`)
  if (c.payments) parts.push(`${c.payments} payment(s)`)
  if (c.statements) parts.push(`${c.statements} billing statement(s)`)
  return parts
}

export type { Customer, Job, Payment, Quotation, ServiceReport, BillingStatement }
