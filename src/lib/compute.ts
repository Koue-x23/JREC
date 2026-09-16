import type { Invoice, InvoiceStatusValue, LineItem, Payment, Quotation, QuotationStatus } from './types'
import { round2, todayStr } from './format'

export function lineAmount(item: LineItem): number {
  return round2(item.quantity * item.unit_price)
}

export interface Totals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

export function computeTotals(items: LineItem[], discount: number, taxRate: number): Totals {
  const subtotal = round2(items.reduce((s, it) => s + lineAmount(it), 0))
  const taxable = Math.max(0, subtotal - discount)
  const tax = round2((taxable * taxRate) / 100)
  return { subtotal, discount: round2(discount), tax, total: round2(taxable + tax) }
}

export function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'pcs', unit_price: 0 }
}

/** Payment status derived from amount paid + due date (spec order: Paid > Overdue > Partial > Unpaid). */
export function invoiceStatusOf(total: number, paid: number, dueDate: string, onDay: string = todayStr()): InvoiceStatusValue {
  if (paid >= total - 0.005 && total >= 0) return 'Paid'
  if (onDay > dueDate) return 'Overdue'
  if (paid > 0) return 'Partially Paid'
  return 'Unpaid'
}

/** Quotation status taking validity into account. */
export function quotationStatusOf(q: Quotation, onDay: string = todayStr()): QuotationStatus {
  if (q.status === 'Draft' || q.status === 'Sent' || q.status === 'Pending') {
    if (q.valid_until && q.valid_until < onDay) return 'Expired'
  }
  return q.status
}

export function invoicePaid(invoiceId: string, payments: Payment[]): number {
  return round2(
    payments.filter((p) => p.invoice_id === invoiceId).reduce((s, p) => s + p.amount, 0),
  )
}

export interface InvoiceDerived extends Totals {
  paid: number
  balance: number
  status: InvoiceStatusValue
  daysOverdue: number
}

export function deriveInvoice(inv: Invoice, payments: Payment[], onDay: string = todayStr()): InvoiceDerived {
  const t = computeTotals(inv.items, inv.discount, inv.tax_rate)
  const paid = invoicePaid(inv.id, payments)
  const balance = round2(t.total - paid)
  const status = invoiceStatusOf(t.total, paid, inv.due_date, onDay)
  const daysOverdue = status === 'Overdue' || (balance > 0 && onDay > inv.due_date)
    ? Math.max(0, Math.round((Date.parse(onDay) - Date.parse(inv.due_date)) / 86_400_000))
    : 0
  return { ...t, paid, balance, status, daysOverdue }
}
