import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Payment } from '../lib/types'
import { PAYMENT_METHODS } from '../lib/types'
import { fmtDate, money } from '../lib/format'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingPanel,
  PageHeader,
  Pager,
  StatCard,
  usePaged,
  type Column,
} from '../components/ui'
import { PaymentForm, type PaymentFormValues } from '../components/forms/PaymentForm'

export default function Payments() {
  const { data, loading, createPayment, updatePayment, deletePayment } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const [method, setMethod] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)

  const invoiceLockId = params.get('invoice') ?? ''

  useEffect(() => {
    if (params.get('new')) {
      setEditing(null)
      setFormOpen(true)
    }
  }, [params])

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    if (params.get('new') || params.get('invoice')) {
      params.delete('new')
      params.delete('invoice')
      setParams(params, { replace: true })
    }
  }

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.payments
      .map((p) => {
        const c = data.customers.find((x) => x.id === p.customer_id)
        const inv = data.invoices.find((i) => i.id === p.invoice_id)
        return {
          ...p,
          customer: c,
          invoice: inv,
          search: `${p.number} ${p.method} ${p.reference} ${p.notes} ${c?.name ?? ''} ${c?.company ?? ''} ${inv?.number ?? ''}`.toLowerCase(),
        }
      })
      .filter((p) => !needle || p.search.includes(needle))
      .filter((p) => method === 'all' || p.method === method)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data, q, method])

  const paged = usePaged(rows, 10)

  const totals = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    return {
      all: rows.reduce((s, p) => s + p.amount, 0),
      month: data.payments
        .filter((p) => p.date.slice(0, 7) === month)
        .reduce((s, p) => s + p.amount, 0),
      cash: rows.filter((p) => p.method === 'Cash').reduce((s, p) => s + p.amount, 0),
      digital: rows
        .filter((p) => p.method === 'GCash' || p.method === 'Bank Transfer')
        .reduce((s, p) => s + p.amount, 0),
    }
  }, [rows, data.payments])

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (p) => <span className="col-num" style={{ fontWeight: 600 }}>{p.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      label: 'Customer',
      render: (p) => (
        <div>
          <div className="col-strong">{p.customer?.name ?? '—'}</div>
          {p.invoice && <div className="muted small">for {p.invoice.number}</div>}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      label: 'Date',
      render: (p) => <span className="small nowrap">{fmtDate(p.date)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      label: 'Method',
      render: (p) => <span className="chip">{p.method}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      label: 'Reference',
      hideOnMobile: true,
      render: (p) => <span className="small mono">{p.reference || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      label: 'Amount',
      render: (p) => (
        <span className="col-money" style={{ color: 'var(--ok)', fontWeight: 600 }}>
          {money(p.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (p) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Edit" onClick={() => { setEditing(p); setFormOpen(true) }}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(p)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const submitForm = async (values: PaymentFormValues) => {
    try {
      if (editing) {
        await updatePayment(editing.id, values)
        toast.success(`Payment ${editing.number} updated.`)
      } else {
        const p = await createPayment(values)
        toast.success(`Payment ${p.number} recorded — balances updated.`)
      }
      closeForm()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save payment.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deletePayment(deleting.id)
      toast.success(`Payment ${deleting.number} deleted — invoice balance restored.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete payment.')
    } finally {
      setBusy(false)
    }
  }

  const lockInvoice = invoiceLockId ? data.invoices.find((i) => i.id === invoiceLockId) : undefined

  return (
    <div className="page">
      <PageHeader
        kicker="Module 07 · Collections"
        title="Payments"
        sub={`${data.payments.length} payment(s) recorded`}
      >
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
          Record Payment
        </Button>
      </PageHeader>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
        <StatCard label="Collected (all time)" value={money(totals.all)} money tone="ok" icon={<Wallet size={16} />} />
        <StatCard label="Collected this month" value={money(totals.month)} money tone="info" icon={<CreditCard size={16} />} />
        <StatCard label="Cash" value={money(totals.cash)} money icon={<Wallet size={16} />} />
        <StatCard label="GCash + Bank" value={money(totals.digital)} money tone="red" icon={<CreditCard size={16} />} />
      </div>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <CreditCard size={14} />
          <input
            placeholder="Search number, customer, reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={paged.paged}
            ariaLabel="Payments"
            empty={
              <EmptyState
                icon={<CreditCard size={22} />}
                title="No payments found"
                hint={
                  q || method !== 'all'
                    ? 'Try a different search or method filter.'
                    : 'Record payments against invoices — balances and statuses update everywhere automatically.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
                    Record Payment
                  </Button>
                }
              />
            }
          />
          <Pager
            page={paged.page}
            pageCount={paged.pageCount}
            onPage={paged.setPage}
            total={paged.total}
            unit="payments"
          />
        </>
      )}

      <PaymentForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={submitForm}
        customers={data.customers}
        invoices={data.invoices}
        payments={data.payments}
        initial={editing}
        invoiceLock={editing ? undefined : lockInvoice}
        title={editing ? `Edit Payment ${editing.number}` : 'Record Payment'}
        subtitle={editing ? undefined : 'Applied to invoice balances instantly'}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete payment?"
        confirmLabel="Delete payment"
        busy={busy}
        message={
          <>
            Delete payment <b>{deleting?.number}</b> ({money(deleting?.amount ?? 0)})? The invoice
            balance and payment status will be restored accordingly.
          </>
        }
      />
    </div>
  )
}
