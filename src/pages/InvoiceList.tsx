import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Pencil, Plus, Printer, Receipt, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Invoice } from '../lib/types'
import { INVOICE_STATUSES } from '../lib/types'
import { fmtDate, money } from '../lib/format'
import { invoiceViews } from '../lib/selectors'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingPanel,
  PageHeader,
  Pager,
  StatusBadge,
  usePaged,
  type Column,
} from '../components/ui'

export default function InvoiceList() {
  const { data, loading, deleteInvoice } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [deleting, setDeleting] = useState<Invoice | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return invoiceViews(data)
      .map((v) => {
        const job = data.jobs.find((j) => j.id === v.job_id)
        return {
          ...v,
          job,
          search: `${v.number} ${v.project_name} ${v.customer_name} ${job?.number ?? ''} ${v.notes}`.toLowerCase(),
        }
      })
      .filter((v) => !needle || v.search.includes(needle))
      .filter((v) => status === 'all' || v.status === status)
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
  }, [data, q, status])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (v) => <span className="col-num" style={{ fontWeight: 600 }}>{v.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer / Project',
      label: 'Customer',
      render: (v) => (
        <div style={{ minWidth: 200 }}>
          <div className="col-strong">{v.customer_name}</div>
          <div className="muted small">{v.project_name}</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Issued',
      label: 'Issued',
      render: (v) => <span className="small nowrap">{fmtDate(v.invoice_date)}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      label: 'Due',
      hideOnMobile: true,
      render: (v) => (
        <span className={`small nowrap ${v.status === 'Overdue' ? 'red' : 'muted'}`}>
          {fmtDate(v.due_date)}
          {v.daysOverdue > 0 ? ` (${v.daysOverdue}d)` : ''}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      label: 'Total',
      render: (v) => <span className="col-money">{money(v.total)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      label: 'Balance',
      render: (v) => (
        <span className="col-money" style={{ color: v.balance > 0.005 ? 'var(--red)' : 'var(--ok)', fontWeight: 600 }}>
          {money(v.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      render: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (v) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="icon-btn"
            title="Record payment"
            onClick={() => navigate(`/payments?new=1&invoice=${v.id}`)}
          >
            <CreditCard size={15} />
          </button>
          <button className="icon-btn" title="Print" onClick={() => navigate(`/invoices/${v.id}`)}>
            <Printer size={15} />
          </button>
          <button className="icon-btn" title="Edit" onClick={() => navigate(`/invoices/${v.id}/edit`)}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(v)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const paymentCount = (invoiceId: string) => data.payments.filter((p) => p.invoice_id === invoiceId).length

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteInvoice(deleting.id)
      toast.success(`${deleting.number} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete invoice.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Module 06 · Billing"
        title="Invoices"
        sub={`${data.invoices.length} invoice(s) on file`}
      >
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/invoices/new')}>
          New Invoice
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <Receipt size={14} />
          <input
            placeholder="Search number, customer, project…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
            onRowClick={(v) => navigate(`/invoices/${v.id}`)}
            ariaLabel="Invoices"
            empty={
              <EmptyState
                icon={<Receipt size={22} />}
                title="No invoices found"
                hint={
                  q || status !== 'all'
                    ? 'Try a different search or status filter.'
                    : 'Invoice your jobs and services — payments update balances automatically.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/invoices/new')}>
                    New Invoice
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
            unit="invoices"
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete invoice?"
        confirmLabel="Delete invoice"
        busy={busy}
        message={
          deleting && paymentCount(deleting.id) > 0 ? (
            <>
              <b>{deleting.number}</b> has {paymentCount(deleting.id)} payment(s) recorded. Delete
              those payments first — or keep the invoice for your financial history.
            </>
          ) : (
            <>
              Permanently delete <b>{deleting?.number}</b>? This cannot be undone.
            </>
          )
        }
      />
    </div>
  )
}
