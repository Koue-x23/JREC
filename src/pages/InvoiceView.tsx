import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, Pencil, Printer, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { fmtDate, money } from '../lib/format'
import { deriveInvoice } from '../lib/compute'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingPanel,
  StatusBadge,
} from '../components/ui'
import { InvoiceDoc } from '../components/documents/InvoiceDoc'
import { PaymentForm, type PaymentFormValues } from '../components/forms/PaymentForm'

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, deleteInvoice, createPayment } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [payOpen, setPayOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const invoice = data.invoices.find((i) => i.id === id)
  const customer = data.customers.find((c) => c.id === invoice?.customer_id)
  const job = data.jobs.find((j) => j.id === invoice?.job_id)
  const derived = useMemo(
    () => (invoice ? deriveInvoice(invoice, data.payments) : null),
    [invoice, data.payments],
  )
  const invoicePayments = useMemo(
    () =>
      data.payments
        .filter((p) => p.invoice_id === invoice?.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments, invoice?.id],
  )

  if (loading) return <LoadingPanel label="Loading invoice…" />

  if (!invoice || !derived) {
    return (
      <div className="page">
        <EmptyState
          title="Invoice not found"
          hint="It may have been deleted."
          action={<Link to="/invoices" className="btn btn-secondary">Back to invoices</Link>}
        />
      </div>
    )
  }

  const recordPayment = async (values: PaymentFormValues) => {
    try {
      const p = await createPayment(values)
      toast.success(`Payment ${p.number} recorded — ${money(values.amount)}.`)
      setPayOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not record payment.')
    }
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteInvoice(invoice.id)
      toast.success(`${invoice.number} deleted.`)
      navigate('/invoices')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete invoice.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="doc-actions no-print">
        <span className="da-title">
          <Link to="/invoices" className="btn btn-ghost btn-sm" style={{ marginRight: 4 }}>
            <ArrowLeft size={14} />
          </Link>
          {invoice.number}
          <StatusBadge status={derived.status} />
        </span>
        <span style={{ flex: 1 }} />
        {derived.balance > 0.005 && (
          <Button variant="primary" icon={<CreditCard size={15} />} onClick={() => setPayOpen(true)}>
            Record Payment
          </Button>
        )}
        <Button icon={<Pencil size={15} />} onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
          Edit
        </Button>
        <Button variant="steel" icon={<Printer size={15} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      <InvoiceDoc invoice={invoice} customer={customer} job={job} payments={invoicePayments} />

      {invoicePayments.length > 0 && (
        <div className="no-print" style={{ maxWidth: 880, margin: '20px auto 0' }}>
          <div className="sec-head">
            <span className="sec-mark" />
            <h2>Payments on this invoice</h2>
            <span className="sec-code">
              {money(derived.paid)} of {money(derived.total)}
            </span>
          </div>
          <div className="card">
            {invoicePayments.map((p) => (
              <div key={p.id} className="list-row">
                <span className="rr-num" style={{ font: '600 12px var(--font-mono)', background: 'var(--steel-50)', border: '1px solid var(--steel-200)', borderRadius: 5, padding: '3px 7px' }}>
                  {p.number}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  <span className="muted small">
                    {fmtDate(p.date)}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </span>
                </span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--ok)' }}>
                  {money(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentForm
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSubmit={recordPayment}
        customers={data.customers}
        invoices={data.invoices}
        payments={data.payments}
        invoiceLock={invoice}
        title={`Record Payment — ${invoice.number}`}
        subtitle={`Balance due ${money(derived.balance)}`}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={doDelete}
        title="Delete invoice?"
        confirmLabel="Delete invoice"
        busy={busy}
        message={
          invoicePayments.length > 0 ? (
            <>
              This invoice has {invoicePayments.length} payment(s). Delete the payments first to keep
              your cash records consistent.
            </>
          ) : (
            <>
              Permanently delete <b>{invoice.number}</b>? This cannot be undone.
            </>
          )
        }
      />
    </div>
  )
}
