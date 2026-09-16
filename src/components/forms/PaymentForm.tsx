import { useEffect, useMemo, useState } from 'react'
import type { Invoice, Payment, PaymentMethod } from '../../lib/types'
import { PAYMENT_METHODS } from '../../lib/types'
import { deriveInvoice } from '../../lib/compute'
import { money, todayStr } from '../../lib/format'
import { Button, Field, Modal } from '../ui'

export interface PaymentFormValues {
  date: string
  customer_id: string
  invoice_id: string
  amount: number
  method: PaymentMethod
  reference: string
  notes: string
}

export function PaymentForm({
  open,
  onClose,
  onSubmit,
  customers,
  invoices,
  payments,
  invoiceLock,
  initial,
  title = 'Record Payment',
  subtitle,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: PaymentFormValues) => Promise<void> | void
  customers: { id: string; name: string; company: string }[]
  invoices: Invoice[]
  payments: Payment[]
  invoiceLock?: Invoice
  initial?: Payment | null
  title?: string
  subtitle?: string
}) {
  const [values, setValues] = useState<PaymentFormValues>({
    date: todayStr(),
    customer_id: '',
    invoice_id: '',
    amount: 0,
    method: 'Cash',
    reference: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  const views = useMemo(
    () => invoices.map((inv) => ({ inv, d: deriveInvoice(inv, payments) })),
    [invoices, payments],
  )

  useEffect(() => {
    if (!open) return
    setTouched(false)
    if (initial) {
      setValues({
        date: initial.date,
        customer_id: initial.customer_id,
        invoice_id: initial.invoice_id,
        amount: initial.amount,
        method: initial.method,
        reference: initial.reference,
        notes: initial.notes,
      })
    } else if (invoiceLock) {
      const balance = deriveInvoice(invoiceLock, payments).balance
      setValues({
        date: todayStr(),
        customer_id: invoiceLock.customer_id,
        invoice_id: invoiceLock.id,
        amount: Math.max(0, balance),
        method: 'Cash',
        reference: '',
        notes: '',
      })
    } else {
      setValues({
        date: todayStr(),
        customer_id: '',
        invoice_id: '',
        amount: 0,
        method: 'Cash',
        reference: '',
        notes: '',
      })
    }
  }, [open, invoiceLock, initial, payments])

  const openInvoices = views
    .filter(({ inv, d }) => d.balance > 0.005 || inv.id === values.invoice_id)
    .filter(({ inv }) => !values.customer_id || inv.customer_id === values.customer_id)
    .sort((a, b) => b.inv.invoice_date.localeCompare(a.inv.invoice_date))

  const selected = views.find(({ inv }) => inv.id === values.invoice_id)
  const selectedBalance = selected?.d.balance ?? 0

  const amountError =
    touched && (values.amount <= 0 || (selected && values.amount > selectedBalance + 0.005))
      ? `Amount must be between ₱0 and ${money(selectedBalance)} (remaining balance).`
      : ''

  const submit = async () => {
    setTouched(true)
    if (!values.invoice_id || values.amount <= 0) return
    if (selected && values.amount > selectedBalance + 0.005) return
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Recording…' : 'Record Payment'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {!invoiceLock && (
          <Field label="Customer">
            <select
              className="input"
              value={values.customer_id}
              onChange={(e) => setValues((v) => ({ ...v, customer_id: e.target.value, invoice_id: '' }))}
            >
              <option value="">— All customers —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Payment Date">
          <input
            className="input"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          />
        </Field>
        <Field label="Invoice" required className="span-2" hint="Only invoices with a remaining balance are listed.">
          <select
            className="input"
            value={values.invoice_id}
            onChange={(e) => {
              const inv = invoices.find((i) => i.id === e.target.value)
              const bal = inv ? deriveInvoice(inv, payments).balance : 0
              setValues((v) => ({
                ...v,
                invoice_id: e.target.value,
                customer_id: inv?.customer_id ?? v.customer_id,
                amount: Math.max(0, bal),
              }))
            }}
          >
            <option value="">— Select invoice —</option>
            {openInvoices.map(({ inv, d }) => {
              const c = customers.find((x) => x.id === inv.customer_id)
              return (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · {c?.name ?? ''} · balance {money(d.balance)}
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Amount" required error={amountError}>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={values.amount || ''}
            onChange={(e) => setValues((v) => ({ ...v, amount: Number(e.target.value) || 0 }))}
          />
        </Field>
        <Field label="Payment Method">
          <select
            className="input"
            value={values.method}
            onChange={(e) => setValues((v) => ({ ...v, method: e.target.value as PaymentMethod }))}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference Number" hint="GCash ref, bank slip no., etc.">
          <input
            className="input"
            value={values.reference}
            onChange={(e) => setValues((v) => ({ ...v, reference: e.target.value }))}
          />
        </Field>
        <Field label="Notes">
          <input
            className="input"
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          />
        </Field>
        {selected && (
          <div className="span-2" style={{ background: 'var(--steel-50)', border: '1px solid var(--steel-100)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--steel-600)' }}>
            <b className="mono">{selected.inv.number}</b> — total {money(selected.d.total)} · already paid{' '}
            {money(selected.d.paid)} · balance{' '}
            <b className="mono" style={{ color: selectedBalance > 0 ? 'var(--red)' : 'var(--ok)' }}>
              {money(selectedBalance)}
            </b>
          </div>
        )}
      </div>
    </Modal>
  )
}
