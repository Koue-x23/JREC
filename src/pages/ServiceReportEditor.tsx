import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { ServiceStatus } from '../lib/types'
import { SERVICE_STATUSES } from '../lib/types'
import { todayStr } from '../lib/format'
import { Button, Field, PageHeader, SectionHead } from '../components/ui'

interface Draft {
  service_date: string
  customer_id: string
  location: string
  job_id: string
  item_product: string
  problem_request: string
  work_performed: string
  materials_used: string
  status: ServiceStatus
  technician: string
  remarks: string
  acknowledged_by: string
}

export default function ServiceReportEditor() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { data, createServiceReport, updateServiceReport } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const existing = id ? data.service_reports.find((s) => s.id === id) : undefined
  const jobFromQuery = params.get('job') ?? ''

  const makeDraft = (): Draft => {
    if (existing) {
      return {
        service_date: existing.service_date,
        customer_id: existing.customer_id,
        location: existing.location,
        job_id: existing.job_id ?? '',
        item_product: existing.item_product,
        problem_request: existing.problem_request,
        work_performed: existing.work_performed,
        materials_used: existing.materials_used,
        status: existing.status,
        technician: existing.technician,
        remarks: existing.remarks,
        acknowledged_by: existing.acknowledged_by,
      }
    }
    const job = data.jobs.find((j) => j.id === jobFromQuery)
    const customer = job ? job.customer_id : params.get('customer') ?? ''
    return {
      service_date: todayStr(),
      customer_id: customer,
      location: job ? '' : '',
      job_id: jobFromQuery,
      item_product: '',
      problem_request: '',
      work_performed: '',
      materials_used: '',
      status: 'Pending',
      technician: '',
      remarks: '',
      acknowledged_by: '',
    }
  }

  const [draft, setDraft] = useState<Draft>(makeDraft)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setDraft(makeDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, jobFromQuery, data.jobs.length, data.customers.length])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const customerJobs = useMemo(
    () => data.jobs.filter((j) => j.customer_id === draft.customer_id),
    [data.jobs, draft.customer_id],
  )

  const nextNumberPreview = useMemo(() => {
    const seq = data.settings.sequences.SR
    return `${seq.prefix}-${String(seq.next).padStart(5, '0')}`
  }, [data.settings.sequences.SR])

  const customerError = touched && !draft.customer_id ? 'Select a customer.' : ''

  const save = async () => {
    setTouched(true)
    if (!draft.customer_id) {
      toast.error('Please select a customer.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        service_date: draft.service_date,
        customer_id: draft.customer_id,
        location: draft.location,
        job_id: draft.job_id || null,
        item_product: draft.item_product,
        problem_request: draft.problem_request,
        work_performed: draft.work_performed,
        materials_used: draft.materials_used,
        status: draft.status,
        technician: draft.technician,
        remarks: draft.remarks,
        acknowledged_by: draft.acknowledged_by,
        acknowledged_at: draft.acknowledged_by ? draft.service_date : '',
      }
      if (existing) {
        await updateServiceReport(existing.id, payload)
        toast.success(`${existing.number} updated.`)
        navigate(`/service-reports/${existing.id}`)
      } else {
        const created = await createServiceReport(payload)
        toast.success(`Service report ${created.number} saved.`)
        navigate(`/service-reports/${created.id}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save service report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker={existing ? `Module 05 · Edit ${existing.number}` : 'Module 05 · New document'}
        title={existing ? 'Edit Service Report' : 'New Service Report'}
        sub={existing ? `Editing ${existing.number}` : `Will be numbered ${nextNumberPreview} on save`}
      >
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/service-reports/${existing.id}` : '/service-reports')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Report'}
        </Button>
      </PageHeader>

      <div className="card card-pad">
        <div className="form-grid">
          <Field label="Service Date" required>
            <input className="input" type="date" value={draft.service_date} onChange={(e) => set({ service_date: e.target.value })} />
          </Field>
          <Field label="Customer" required error={customerError}>
            <select
              className="input"
              value={draft.customer_id}
              onChange={(e) => set({ customer_id: e.target.value, job_id: '' })}
            >
              <option value="">— Select customer —</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location" className="span-2">
            <input
              className="input"
              value={draft.location}
              onChange={(e) => set({ location: e.target.value })}
              placeholder="Site / branch where service was performed"
            />
          </Field>
          <Field label="Job Number" hint="Links this report to a project">
            <select className="input" value={draft.job_id} onChange={(e) => set({ job_id: e.target.value })}>
              <option value="">— Standalone service —</option>
              {customerJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.number} — {j.project_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Item / Product">
            <input
              className="input"
              value={draft.item_product}
              onChange={(e) => set({ item_product: e.target.value })}
              placeholder="Equipment or fixture serviced"
            />
          </Field>
          <Field label="Problem / Request" className="span-2">
            <textarea
              className="input"
              value={draft.problem_request}
              onChange={(e) => set({ problem_request: e.target.value })}
              placeholder="What was reported or requested?"
            />
          </Field>
          <Field label="Work Performed" className="span-2">
            <textarea
              className="input"
              value={draft.work_performed}
              onChange={(e) => set({ work_performed: e.target.value })}
              placeholder="Steps taken on site…"
            />
          </Field>
          <Field label="Materials Used" className="span-2">
            <textarea
              className="input"
              value={draft.materials_used}
              onChange={(e) => set({ materials_used: e.target.value })}
              placeholder="Consumables, parts, quantities…"
            />
          </Field>
          <Field label="Status">
            <select className="input" value={draft.status} onChange={(e) => set({ status: e.target.value as ServiceStatus })}>
              {SERVICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Welder / Technician">
            <input
              className="input"
              value={draft.technician}
              onChange={(e) => set({ technician: e.target.value })}
              placeholder="Who performed the work"
            />
          </Field>
          <Field label="Remarks" className="span-2">
            <textarea
              className="input"
              value={draft.remarks}
              onChange={(e) => set({ remarks: e.target.value })}
              placeholder="Recommendations, follow-ups…"
            />
          </Field>
          <Field
            label="Customer Acknowledgment"
            className="span-2"
            hint="Name of the customer representative who received/inspected the work. Signs the printed report."
          >
            <input
              className="input"
              value={draft.acknowledged_by}
              onChange={(e) => set({ acknowledged_by: e.target.value })}
              placeholder="e.g. Marina Dela Cruz — acknowledged on site"
            />
          </Field>
        </div>
      </div>

      <SectionHead title="Before Saving" code="A4 print ready" />
      <div className="card card-pad muted small" style={{ color: 'var(--steel-600)' }}>
        The printed report includes the JREC letterhead, the sections above, technician and customer
        acknowledgment signature lines, and an engineering title block — ready for A4 printing or
        PDF export from the view page.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/service-reports/${existing.id}` : '/service-reports')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Report'}
        </Button>
      </div>
    </div>
  )
}
