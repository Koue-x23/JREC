import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardList,
  HardHat,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { computeTotals, quotationStatusOf } from '../lib/compute'
import { fmtDate, money } from '../lib/format'
import { invoiceViews } from '../lib/selectors'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingPanel,
  StatusBadge,
} from '../components/ui'
import { JobForm, type JobFormValues } from '../components/forms/JobForm'

export default function JobView() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, updateJob, deleteJob } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const job = data.jobs.find((j) => j.id === id)

  const rel = useMemo(() => {
    if (!job) return null
    const quotation = data.quotations.find((q) => q.id === job.quotation_id)
    const reports = data.service_reports
      .filter((s) => s.job_id === job.id)
      .sort((a, b) => b.service_date.localeCompare(a.service_date))
    const invoices = invoiceViews(data)
      .filter((v) => v.job_id === job.id)
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
    const invoiceIds = new Set(invoices.map((v) => v.id))
    const payments = data.payments
      .filter((p) => invoiceIds.has(p.invoice_id))
      .sort((a, b) => b.date.localeCompare(a.date))
    const customer = data.customers.find((c) => c.id === job.customer_id)
    return { quotation, reports, invoices, payments, customer }
  }, [job, data])

  if (loading) return <LoadingPanel label="Loading job…" />

  if (!job || !rel) {
    return (
      <div className="page">
        <EmptyState
          icon={<HardHat size={22} />}
          title="Job not found"
          hint="It may have been deleted."
          action={<Link to="/jobs" className="btn btn-secondary">Back to jobs</Link>}
        />
      </div>
    )
  }

  const { quotation, reports, invoices, payments, customer } = rel

  // Timeline: quotation → approved → job started → service report → invoice → payment → completed
  const firstPaymentDate = payments.length ? payments[payments.length - 1].date : ''
  const steps = [
    {
      key: 'quo',
      label: 'Quotation',
      done: !!quotation,
      date: quotation?.date ?? '',
      to: quotation ? `/quotations/${quotation.id}` : undefined,
    },
    {
      key: 'approved',
      label: 'Approved',
      done: !!quotation && quotationStatusOf(quotation) === 'Approved',
      date: quotation && quotationStatusOf(quotation) === 'Approved' ? quotation.date : '',
      to: quotation ? `/quotations/${quotation.id}` : undefined,
    },
    {
      key: 'started',
      label: 'Job Started',
      done: job.status !== 'Pending',
      date: job.start_date,
      to: undefined,
    },
    {
      key: 'sr',
      label: 'Service Report',
      done: reports.length > 0,
      date: reports.length ? reports[reports.length - 1].service_date : '',
      to: reports.length ? `/service-reports/${reports[reports.length - 1].id}` : undefined,
    },
    {
      key: 'inv',
      label: 'Invoice',
      done: invoices.length > 0,
      date: invoices.length ? invoices[invoices.length - 1].invoice_date : '',
      to: invoices.length ? `/invoices/${invoices[invoices.length - 1].id}` : undefined,
    },
    {
      key: 'pay',
      label: 'Payment',
      done: payments.length > 0,
      date: firstPaymentDate,
      to: invoices.length ? `/invoices/${invoices[invoices.length - 1].id}` : undefined,
    },
    {
      key: 'completed',
      label: 'Completed',
      done: job.status === 'Completed',
      date: job.actual_completion,
      to: undefined,
    },
  ]
  const firstUndone = steps.findIndex((s) => !s.done)
  const currentIdx = firstUndone === -1 ? -1 : firstUndone

  const submitEdit = async (values: JobFormValues) => {
    try {
      await updateJob(job.id, values)
      toast.success(`${job.number} updated.`)
      setEditOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update job.')
    }
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteJob(job.id)
      toast.success(`${job.number} deleted.`)
      navigate('/jobs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete job.')
    } finally {
      setBusy(false)
    }
  }

  const invoiced = invoices.reduce((s, v) => s + v.total, 0)
  const collected = invoices.reduce((s, v) => s + v.paid, 0)

  return (
    <div className="page">
      <div className="page-head no-print">
        <div>
          <div className="kicker">Module 04 · Production</div>
          <h1>
            {job.number} <StatusBadge status={job.status} />
          </h1>
          <div className="page-sub">{job.project_name}</div>
        </div>
        <div className="page-actions">
          <Link to={`/service-reports/new?job=${job.id}`} className="btn btn-secondary">
            <ClipboardList size={15} /> New Service Report
          </Link>
          <Link to={`/invoices/new?job=${job.id}`} className="btn btn-secondary">
            <Receipt size={15} /> Create Invoice
          </Link>
          <Button icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Project timeline */}
      <div className="card" style={{ padding: '6px 14px 14px' }}>
        <div className="timeline">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`tl-step ${s.done ? 'done' : ''} ${i === currentIdx ? 'current' : ''} ${s.to ? 'link' : ''}`}
              onClick={s.to ? () => navigate(s.to!) : undefined}
              title={s.to ? 'Open record' : undefined}
            >
              <div className="tl-dot">
                {s.done ? <Check size={15} /> : i === currentIdx ? <HardHat size={14} /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--steel-300)' }} />}
              </div>
              <div className="tl-title">{s.label}</div>
              <div className="tl-date">{s.date ? fmtDate(s.date) : '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 14 }}>
        <div className="card card-pad">
          <div className="sec-head" style={{ marginTop: 0 }}>
            <span className="sec-mark" />
            <h2>Job Details</h2>
          </div>
          <div className="kv-grid">
            <div className="kv">
              <div className="k">Customer</div>
              <div className="v">
                <Link to={`/customers/${job.customer_id}`} style={{ color: 'var(--info)' }}>
                  {customer?.name ?? '—'}
                </Link>
              </div>
            </div>
            <div className="kv">
              <div className="k">Related Quotation</div>
              <div className="v">
                {quotation ? (
                  <Link to={`/quotations/${quotation.id}`} style={{ color: 'var(--info)' }}>
                    {quotation.number} — {quotationStatusOf(quotation)}
                  </Link>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="kv">
              <div className="k">Start Date</div>
              <div className="v">{fmtDate(job.start_date)}</div>
            </div>
            <div className="kv">
              <div className="k">Expected Completion</div>
              <div className="v">{fmtDate(job.expected_completion)}</div>
            </div>
            <div className="kv">
              <div className="k">Actual Completion</div>
              <div className="v">{fmtDate(job.actual_completion)}</div>
            </div>
            <div className="kv">
              <div className="k">Assigned Fabricator</div>
              <div className="v">{job.fabricator || '—'}</div>
            </div>
          </div>
          {job.description && (
            <>
              <div className="brushed-rule" />
              <div className="note-block">{job.description}</div>
            </>
          )}
          {job.notes && (
            <div className="note-block red-edge" style={{ marginTop: 10 }}>
              {job.notes}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="sec-head" style={{ marginTop: 0 }}>
            <span className="sec-mark" />
            <h2>Billing Snapshot</h2>
          </div>
          <div className="kv-grid">
            <div className="kv">
              <div className="k">Quoted Value</div>
              <div className="v">
                {quotation ? money(computeTotals(quotation.items, quotation.discount, quotation.tax_rate).total) : '—'}
              </div>
            </div>
            <div className="kv">
              <div className="k">Invoiced</div>
              <div className="v">{money(invoiced)}</div>
            </div>
            <div className="kv">
              <div className="k">Collected</div>
              <div className="v">{money(collected)}</div>
            </div>
            <div className="kv">
              <div className="k">Remaining</div>
              <div className="v" style={{ color: invoiced - collected > 0.005 ? 'var(--red)' : undefined }}>
                {money(invoiced - collected)}
              </div>
            </div>
          </div>
          <div className="brushed-rule" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoices.map((v) => (
              <Link key={v.id} to={`/invoices/${v.id}`} className="list-row" style={{ padding: '10px 12px', border: '1px solid var(--steel-100)', borderRadius: 8 }}>
                <Receipt size={15} style={{ color: 'var(--steel-400)' }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{v.number}</span>
                  <span className="muted small">{fmtDate(v.invoice_date)}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{money(v.total)}</span>
                  <div style={{ marginTop: 3 }}><StatusBadge status={v.status} /></div>
                </span>
              </Link>
            ))}
            {invoices.length === 0 && (
              <div className="muted small" style={{ padding: '6px 2px' }}>
                No invoices yet for this job.{' '}
                <Link to={`/invoices/new?job=${job.id}`} style={{ color: 'var(--red)', fontWeight: 600 }}>
                  Create invoice →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sec-head">
        <span className="sec-mark" />
        <h2>Service Reports</h2>
        <span className="sec-code">{reports.length} record(s)</span>
        <Link to={`/service-reports/new?job=${job.id}`} className="sec-link">
          + New report
        </Link>
      </div>
      <div className="card">
        {reports.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="No service reports yet"
            hint="Document site work, problems, and materials used as the job progresses."
            action={
              <Link to={`/service-reports/new?job=${job.id}`} className="btn btn-primary">
                <Plus size={15} /> New Service Report
              </Link>
            }
          />
        ) : (
          reports.map((s) => (
            <Link key={s.id} to={`/service-reports/${s.id}`} className="list-row">
              <span className="rr-num" style={{ font: '600 12px var(--font-mono)', background: 'var(--steel-50)', border: '1px solid var(--steel-200)', borderRadius: 5, padding: '3px 7px' }}>
                {s.number}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{s.item_product || s.problem_request}</span>
                <span className="muted small">
                  {s.technician || '—'} · {fmtDate(s.service_date)} · {s.location}
                </span>
              </span>
              <StatusBadge status={s.status} />
            </Link>
          ))
        )}
      </div>

      <JobForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={submitEdit}
        initial={job}
        customers={data.customers}
        quotations={data.quotations}
        title={`Edit ${job.number}`}
        subtitle="Update production details"
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={doDelete}
        title="Delete job?"
        confirmLabel="Delete job"
        busy={busy}
        message={
          reports.length > 0 || invoices.length > 0 ? (
            <>
              <b>{job.number}</b> has {reports.length} service report(s) and {invoices.length}{' '}
              invoice(s) attached. Delete those records first.
            </>
          ) : (
            <>
              Permanently delete <b>{job.number}</b>? This cannot be undone.
            </>
          )
        }
      />
    </div>
  )
}

function Check({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
