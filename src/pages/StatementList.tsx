import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { BillingStatement } from '../lib/types'
import { fmtDate, money } from '../lib/format'
import { customerStats } from '../lib/selectors'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingPanel,
  PageHeader,
  Pager,
  usePaged,
  type Column,
} from '../components/ui'
import { StatementForm, type StatementFormValues } from '../components/forms/StatementForm'

export default function StatementList() {
  const { data, loading, generateStatement, deleteStatement } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<BillingStatement | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.statements
      .map((b) => {
        const c = data.customers.find((x) => x.id === b.customer_id)
        return {
          ...b,
          customer: c,
          search: `${b.number} ${c?.name ?? ''} ${c?.company ?? ''}`.toLowerCase(),
        }
      })
      .filter((b) => !needle || b.search.includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data, q])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (b) => <span className="col-num" style={{ fontWeight: 600 }}>{b.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      label: 'Customer',
      render: (b) => (
        <div>
          <div className="col-strong">{b.customer?.name ?? '—'}</div>
          {b.customer?.company && <div className="muted small">{b.customer.company}</div>}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      label: 'Period',
      render: (b) => (
        <span className="small nowrap">
          {fmtDate(b.period_start)} – {fmtDate(b.period_end)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Generated',
      label: 'Generated',
      hideOnMobile: true,
      render: (b) => <span className="small nowrap muted">{fmtDate(b.date)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance at Issue',
      label: 'Balance',
      render: (b) => (
        <span className="col-money" style={{ color: b.current_balance > 0 ? 'var(--red)' : 'var(--ok)', fontWeight: 600 }}>
          {money(b.current_balance)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (b) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(b)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const submit = async (values: StatementFormValues) => {
    try {
      const st = await generateStatement(values)
      toast.success(`Statement ${st.number} generated.`)
      setFormOpen(false)
      navigate(`/billing-statements/${st.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate statement.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteStatement(deleting.id)
      toast.success(`${deleting.number} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete statement.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Module 08 · Statements"
        title="Billing Statements"
        sub={`${data.statements.length} statement(s) generated`}
      >
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>
          Generate Statement
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <BookOpen size={14} />
          <input
            placeholder="Search number or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={paged.paged}
            onRowClick={(b) => navigate(`/billing-statements/${b.id}`)}
            ariaLabel="Billing statements"
            empty={
              <EmptyState
                icon={<BookOpen size={22} />}
                title="No billing statements yet"
                hint="Generate a statement of account per customer — previous balance, new invoices, payments and adjustments in one A4 document."
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>
                    Generate Statement
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
            unit="statements"
          />
        </>
      )}

      <StatementForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        customers={data.customers}
        currentBalances={(cid) => customerStats(data, cid).outstanding}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete billing statement?"
        confirmLabel="Delete statement"
        busy={busy}
        message={
          <>
            Permanently delete <b>{deleting?.number}</b>? The underlying invoices and payments are
            not affected.
          </>
        }
      />
    </div>
  )
}
