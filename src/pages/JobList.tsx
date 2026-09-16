import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HardHat, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Job } from '../lib/types'
import { JOB_STATUSES } from '../lib/types'
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
import { JobForm, type JobFormValues } from '../components/forms/JobForm'

export default function JobList() {
  const { data, loading, createJob, updateJob, deleteJob } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [deleting, setDeleting] = useState<Job | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (params.get('new')) {
      setEditing(null)
      setFormOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.jobs
      .map((j) => {
        const c = data.customers.find((x) => x.id === j.customer_id)
        return {
          ...j,
          customer: c,
          search: `${j.number} ${j.project_name} ${j.description} ${j.fabricator} ${c?.name ?? ''} ${c?.company ?? ''}`.toLowerCase(),
        }
      })
      .filter((j) => !needle || j.search.includes(needle))
      .filter((j) => status === 'all' || j.status === status)
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
  }, [data, q, status])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'number',
      header: 'Number',
      label: 'Number',
      render: (j) => <span className="col-num" style={{ fontWeight: 600 }}>{j.number}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      label: 'Project',
      render: (j) => (
        <div style={{ minWidth: 200 }}>
          <div className="col-strong">{j.project_name}</div>
          <div className="muted small">{j.customer?.name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'fabricator',
      header: 'Fabricator',
      label: 'Fabricator',
      hideOnMobile: true,
      render: (j) => <span className="small">{j.fabricator || '—'}</span>,
    },
    {
      key: 'start',
      header: 'Started',
      label: 'Started',
      render: (j) => <span className="small nowrap">{fmtDate(j.start_date)}</span>,
    },
    {
      key: 'target',
      header: 'Target / Actual',
      label: 'Target',
      hideOnMobile: true,
      render: (j) => (
        <span className="small nowrap muted">
          {fmtDate(j.expected_completion)}
          {j.actual_completion ? ` / ${fmtDate(j.actual_completion)}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      label: 'Status',
      render: (j) => <StatusBadge status={j.status} />,
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (j) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Edit" onClick={() => { setEditing(j); setFormOpen(true) }}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(j)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const submitForm = async (values: JobFormValues) => {
    try {
      if (editing) {
        await updateJob(editing.id, values)
        toast.success(`${editing.number} updated.`)
      } else {
        const job = await createJob(values)
        toast.success(`Job ${job.number} created.`)
        navigate(`/jobs/${job.id}`)
      }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save job.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteJob(deleting.id)
      toast.success(`${deleting.number} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete job.')
    } finally {
      setBusy(false)
    }
  }

  const srCount = (jobId: string) => data.service_reports.filter((s) => s.job_id === jobId).length
  const invCount = (jobId: string) => data.invoices.filter((i) => i.job_id === jobId).length

  return (
    <div className="page">
      <PageHeader
        kicker="Module 04 · Production"
        title="Jobs / Projects"
        sub={`${data.jobs.length} job(s) on file`}
      >
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          New Job
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <HardHat size={14} />
          <input
            placeholder="Search number, project, fabricator…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {JOB_STATUSES.map((s) => (
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
            onRowClick={(j) => navigate(`/jobs/${j.id}`)}
            ariaLabel="Jobs"
            empty={
              <EmptyState
                icon={<HardHat size={22} />}
                title="No jobs found"
                hint={
                  q || status !== 'all'
                    ? 'Try a different search or status filter.'
                    : 'Jobs are created from approved quotations, or directly here.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
                    New Job
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
            unit="jobs"
          />
        </>
      )}

      <JobForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
        initial={editing}
        customers={data.customers}
        quotations={data.quotations}
        title={editing ? `Edit ${editing.number}` : 'New Job'}
        subtitle={
          editing
            ? 'Update production details'
            : `Will be numbered ${data.settings.sequences.JOB.prefix}-${String(data.settings.sequences.JOB.next).padStart(5, '0')} on save`
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete job?"
        confirmLabel="Delete job"
        busy={busy}
        message={
          deleting && (srCount(deleting.id) > 0 || invCount(deleting.id) > 0) ? (
            <>
              <b>{deleting.number}</b> is linked to {srCount(deleting.id)} service report(s) and{' '}
              {invCount(deleting.id)} invoice(s). Delete those first to keep records connected.
            </>
          ) : (
            <>
              Permanently delete <b>{deleting?.number}</b> ({deleting?.project_name})? This cannot be
              undone.
            </>
          )
        }
      />
    </div>
  )
}
