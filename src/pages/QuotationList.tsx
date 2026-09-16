import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Quotation } from '../lib/types'
import { QUOTATION_STATUSES } from '../lib/types'
import { computeTotals, quotationStatusOf } from '../lib/compute'
import { fmtDate, money } from '../lib/format'
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

export default function QuotationList() {
  const { data, loading, duplicateQuotation, deleteQuotation } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [deleting, setDeleting] = useState<Quotation | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.quotations
      .map((qu) => {
        const c = data.customers.find((x) => x.id === qu.customer_id)
        return {
          ...qu,
          effectiveStatus: quotationStatusOf(qu),
          customer: c,
          total: computeTotals(qu.items, qu.discount, qu.tax_rate).total,
          search: `${qu.number} ${qu.project_name} ${c?.name ?? ''} ${c?.company ?? ''} ${qu.description}`.toLowerCase(),
        }
      })
      .filter((r) => !needle || r.search.includes(needle))
      .filter((r) => status === 'all' || r.effectiveStatus === status)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data, q, status])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (r) => <span className="col-num" style={{ fontWeight: 600 }}>{r.number}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      label: 'Project',
      render: (r) => (
        <div style={{ minWidth: 180 }}>
          <div className="col-strong">{r.project_name}</div>
          <div className="muted small">{r.customer?.name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      label: 'Date',
      render: (r) => <span className="small nowrap">{fmtDate(r.date)}</span>,
    },
    {
      key: 'valid',
      header: 'Valid Until',
      label: 'Valid Until',
      hideOnMobile: true,
      render: (r) => <span className="small nowrap muted">{fmtDate(r.valid_until)}</span>,
    },
    {
      key: 'total',
      header: 'Grand Total',
      label: 'Total',
      render: (r) => <span className="col-money">{money(r.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.effectiveStatus} />,
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (r) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Edit" onClick={() => navigate(`/quotations/${r.id}/edit`)}>
            <Pencil size={15} />
          </button>
          <button
            className="icon-btn"
            title="Duplicate"
            onClick={async () => {
              try {
                const copy = await duplicateQuotation(r.id)
                toast.success(`Duplicated as ${copy.number} (Draft).`)
                navigate(`/quotations/${copy.id}/edit`)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not duplicate.')
              }
            }}
          >
            <Copy size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(r)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const jobFor = (quoId: string) => data.jobs.find((j) => j.quotation_id === quoId)

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteQuotation(deleting.id)
      toast.success(`${deleting.number} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Module 03 · Pipeline"
        title="Quotations"
        sub={`${data.quotations.length} quotation(s) on file`}
      >
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/quotations/new')}>
          New Quotation
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <FileText size={14} />
          <input
            placeholder="Search number, project, customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {QUOTATION_STATUSES.map((s) => (
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
            onRowClick={(r) => navigate(`/quotations/${r.id}`)}
            ariaLabel="Quotations"
            empty={
              <EmptyState
                icon={<FileText size={22} />}
                title="No quotations found"
                hint={
                  q || status !== 'all'
                    ? 'Try a different search or status filter.'
                    : 'Create your first quotation — approved quotations can be turned into jobs with one click.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/quotations/new')}>
                    New Quotation
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
            unit="quotations"
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete quotation?"
        confirmLabel="Delete quotation"
        busy={busy}
        message={
          deleting && jobFor(deleting.id) ? (
            <>
              <b>{deleting.number}</b> is linked to job <b>{jobFor(deleting.id)!.number}</b>. Delete
              that job first to keep your records connected.
            </>
          ) : (
            <>
              Permanently delete quotation <b>{deleting?.number}</b> ({deleting?.project_name})? This
              cannot be undone.
            </>
          )
        }
      />
    </div>
  )
}
