import { useEffect, useState } from 'react'
import type { Customer, Job, JobStatus, Quotation } from '../../lib/types'
import { JOB_STATUSES } from '../../lib/types'
import { todayStr } from '../../lib/format'
import { Button, Field, Modal } from '../ui'

export interface JobFormValues {
  customer_id: string
  quotation_id: string | null
  project_name: string
  description: string
  start_date: string
  expected_completion: string
  actual_completion: string
  fabricator: string
  status: JobStatus
  notes: string
}

export const EMPTY_JOB: JobFormValues = {
  customer_id: '',
  quotation_id: null,
  project_name: '',
  description: '',
  start_date: todayStr(),
  expected_completion: '',
  actual_completion: '',
  fabricator: '',
  status: 'Pending',
  notes: '',
}

export function JobForm({
  open,
  onClose,
  onSubmit,
  initial,
  customers,
  quotations,
  title,
  subtitle,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: JobFormValues) => Promise<void> | void
  initial?: Job | null
  customers: Customer[]
  quotations: Quotation[]
  title: string
  subtitle?: string
}) {
  const [values, setValues] = useState<JobFormValues>(EMPTY_JOB)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setTouched(false)
      if (initial) {
        setValues({
          customer_id: initial.customer_id,
          quotation_id: initial.quotation_id,
          project_name: initial.project_name,
          description: initial.description,
          start_date: initial.start_date,
          expected_completion: initial.expected_completion,
          actual_completion: initial.actual_completion,
          fabricator: initial.fabricator,
          status: initial.status,
          notes: initial.notes,
        })
      } else {
        setValues(EMPTY_JOB)
      }
    }
  }, [open, initial])

  const set = (patch: Partial<JobFormValues>) => setValues((v) => ({ ...v, ...patch }))

  const submit = async () => {
    setTouched(true)
    if (!values.customer_id || !values.project_name.trim()) return
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  const customerError = touched && !values.customer_id ? 'Select a customer.' : ''
  const projectError = touched && !values.project_name.trim() ? 'Give the job a project name.' : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save Job'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Customer" required error={customerError}>
          <select
            className="input"
            value={values.customer_id}
            onChange={(e) => set({ customer_id: e.target.value, quotation_id: null })}
          >
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ''} ({c.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={values.status} onChange={(e) => set({ status: e.target.value as JobStatus })}>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Related Quotation"
          hint="Approved quotations of this customer (optional)"
          className="span-2"
        >
          <select
            className="input"
            value={values.quotation_id ?? ''}
            onChange={(e) => set({ quotation_id: e.target.value || null })}
          >
            <option value="">— None —</option>
            {quotations
              .filter(
                (q) =>
                  q.customer_id === values.customer_id &&
                  (initial?.quotation_id === q.id || q.status === 'Approved'),
              )
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.number} — {q.project_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Project Name" className="span-2" required error={projectError}>
          <input
            className="input"
            value={values.project_name}
            onChange={(e) => set({ project_name: e.target.value })}
            placeholder="e.g. Kitchen Exhaust Hood & Ducting"
          />
        </Field>
        <Field label="Description" className="span-2">
          <textarea
            className="input"
            value={values.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Scope, materials, site notes…"
          />
        </Field>
        <Field label="Start Date">
          <input className="input" type="date" value={values.start_date} onChange={(e) => set({ start_date: e.target.value })} />
        </Field>
        <Field label="Expected Completion">
          <input
            className="input"
            type="date"
            value={values.expected_completion}
            onChange={(e) => set({ expected_completion: e.target.value })}
          />
        </Field>
        <Field label="Actual Completion" hint="Set when marking Completed">
          <input
            className="input"
            type="date"
            value={values.actual_completion}
            onChange={(e) => set({ actual_completion: e.target.value })}
          />
        </Field>
        <Field label="Assigned Fabricator">
          <input
            className="input"
            value={values.fabricator}
            onChange={(e) => set({ fabricator: e.target.value })}
            placeholder="Welder / fabricator in charge"
          />
        </Field>
        <Field label="Notes" className="span-2">
          <textarea className="input" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}
