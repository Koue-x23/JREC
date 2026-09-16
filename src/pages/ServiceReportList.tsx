import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { ServiceReport } from '../lib/types'
import { SERVICE_STATUSES } from '../lib/types'
import { fmtDate } from '../lib/format'
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

export default function ServiceReportList() {
  const { data, loading, deleteServiceReport } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [deleting, setDeleting] = useState<ServiceReport | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.service_reports
      .map((s) => {
        const c = data.customers.find((x) => x.id === s.customer_id)
        const job = data.jobs.find((j) => j.id === s.job_id)
        return {
          ...s,
          customer: c,
          job,
          search: `${s.number} ${s.item_product} ${s.problem_request} ${s.work_performed} ${s.technician} ${s.location} ${c?.name ?? ''} ${job?.number ?? ''}`.toLowerCase(),
        }
      })
      .filter((s) => !needle || s.search.includes(needle))
      .filter((s) => status === 'all' || s.status === status)
      .sort((a, b) => b.service_date.localeCompare(a.service_date))
  }, [data, q, status])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (s) => <span className="col-num" style={{ fontWeight: 600 }}>{s.number}</span>,
    },
    {
      key: 'item',
      header: 'Item / Request',
      label: 'Item',
      render: (s) => (
        <div style={{ minWidth: 200 }}>
          <div className="col-strong">{s.item_product || s.problem_request || 'Service'}</div>
          <div className="muted small">{s.customer?.name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      label: 'Job',
      hideOnMobile: true,
      render: (s) =>
        s.job ? (
          <span className="chip">{s.job.number}</span>
        ) : (
          <span className="muted small">Standalone</span>
        ),
    },
    {
      key: 'technician',
      header: 'Technician',
      label: 'Technician',
      hideOnMobile: true,
      render: (s) => <span className="small">{s.technician || '—'}</span>,
    },
    {
      key: 'date',
      header: 'Service Date',
      label: 'Date',
      render: (s) => <span className="small nowrap">{fmtDate(s.service_date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (s) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Edit" onClick={() => navigate(`/service-reports/${s.id}/edit`)}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(s)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteServiceReport(deleting.id)
      toast.success(`${deleting.number} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete service report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Module 05 · Field Service"
        title="Service Reports"
        sub={`${data.service_reports.length} report(s) on file`}
      >
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/service-reports/new')}>
          New Service Report
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <ClipboardList size={14} />
          <input
            placeholder="Search number, item, technician…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {SERVICE_STATUSES.map((s) => (
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
            onRowClick={(s) => navigate(`/service-reports/${s.id}`)}
            ariaLabel="Service reports"
            empty={
              <EmptyState
                icon={<ClipboardList size={22} />}
                title="No service reports found"
                hint={
                  q || status !== 'all'
                    ? 'Try a different search or status filter.'
                    : 'Record every site visit, repair, and installation — printable A4 with customer acknowledgment.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/service-reports/new')}>
                    New Service Report
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
            unit="reports"
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete service report?"
        confirmLabel="Delete report"
        busy={busy}
        message={
          <>
            Permanently delete <b>{deleting?.number}</b>? This cannot be undone.
          </>
        }
      />
    </div>
  )
}
