import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { computeTotals, newLineItem } from '../lib/compute'
import { addDays, todayStr } from '../lib/format'
import { Button, Field, PageHeader, SectionHead } from '../components/ui'
import { LineItemsEditor, TotalsPanel } from '../components/forms/LineItems'

interface Draft {
  invoice_date: string
  due_date: string
  customer_id: string
  job_id: string
  project_name: string
  items: { id: string; description: string; quantity: number; unit: string; unit_price: number }[]
  discount: number
  tax_rate: number
  notes: string
}

export default function InvoiceEditor() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { data, createInvoice, updateInvoice } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const existing = id ? data.invoices.find((i) => i.id === id) : undefined
  const jobFromQuery = params.get('job') ?? ''
  const customerFromQuery = params.get('customer') ?? ''

  const makeDraft = (): Draft => {
    if (existing) {
      return {
        invoice_date: existing.invoice_date,
        due_date: existing.due_date,
        customer_id: existing.customer_id,
        job_id: existing.job_id ?? '',
        project_name: existing.project_name,
        items: existing.items.map((it) => ({ ...it })),
        discount: existing.discount,
        tax_rate: existing.tax_rate,
        notes: existing.notes,
      }
    }
    const today = todayStr()
    const job = data.jobs.find((j) => j.id === jobFromQuery)
    const quotation = job?.quotation_id ? data.quotations.find((q) => q.id === job.quotation_id) : undefined
    return {
      invoice_date: today,
      due_date: addDays(today, data.settings.invoice_due_days || 15),
      customer_id: job?.customer_id ?? customerFromQuery,
      job_id: jobFromQuery,
      project_name: job
        ? `${job.project_name}${quotation ? '' : ''}`
        : '',
      items: quotation
        ? quotation.items.map((it) => ({ ...it }))
        : job
          ? [{ ...newLineItem(), description: `${job.project_name} — as per ${job.number}` }]
          : [newLineItem()],
      discount: quotation?.discount ?? 0,
      tax_rate: quotation?.tax_rate ?? data.settings.tax_rate,
      notes: data.settings.invoice_notes,
    }
  }

  const [draft, setDraft] = useState<Draft>(makeDraft)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setDraft(makeDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, jobFromQuery, data.jobs.length, data.settings])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const customerJobs = useMemo(
    () => data.jobs.filter((j) => j.customer_id === draft.customer_id),
    [data.jobs, draft.customer_id],
  )

  const nextNumberPreview = useMemo(() => {
    const seq = data.settings.sequences.INV
    return `${seq.prefix}-${String(seq.next).padStart(5, '0')}`
  }, [data.settings.sequences.INV])

  const save = async () => {
    setTouched(true)
    if (!draft.customer_id) {
      toast.error('Please select a customer first.')
      return
    }
    const cleanItems = draft.items.filter((i) => i.description.trim() || i.unit_price || i.quantity)
    if (cleanItems.length === 0) {
      toast.error('Add at least one item.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        invoice_date: draft.invoice_date,
        due_date: draft.due_date,
        customer_id: draft.customer_id,
        job_id: draft.job_id || null,
        project_name: draft.project_name.trim() || 'Services & fabricated items',
        items: cleanItems,
        discount: draft.discount,
        tax_rate: draft.tax_rate,
        notes: draft.notes,
        status: 'Unpaid' as const,
      }
      if (existing) {
        await updateInvoice(existing.id, payload)
        toast.success(`${existing.number} updated.`)
        navigate(`/invoices/${existing.id}`)
      } else {
        const created = await createInvoice(payload)
        toast.success(`Invoice ${created.number} saved.`)
        navigate(`/invoices/${created.id}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save invoice.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker={existing ? `Module 06 · Edit ${existing.number}` : 'Module 06 · New document'}
        title={existing ? 'Edit Invoice' : 'New Invoice'}
        sub={
          existing
            ? `Editing ${existing.number}`
            : `Will be numbered ${nextNumberPreview} on save`
        }
      >
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/invoices/${existing.id}` : '/invoices')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Invoice'}
        </Button>
      </PageHeader>

      <div className="card card-pad">
        <div className="form-grid">
          <Field label="Invoice Date" required>
            <input
              className="input"
              type="date"
              value={draft.invoice_date}
              onChange={(e) => {
                const date = e.target.value
                set({ invoice_date: date, due_date: addDays(date, data.settings.invoice_due_days || 15) })
              }}
            />
          </Field>
          <Field label="Due Date" required>
            <input className="input" type="date" value={draft.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </Field>
          <Field label="Customer" required error={touched && !draft.customer_id ? 'Select a customer.' : ''}>
            <select className="input" value={draft.customer_id} onChange={(e) => set({ customer_id: e.target.value, job_id: '' })}>
              <option value="">— Select customer —</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''} ({c.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Related Job" hint="Optional — links billing to a project">
            <select className="input" value={draft.job_id} onChange={(e) => set({ job_id: e.target.value })}>
              <option value="">— No job —</option>
              {customerJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.number} — {j.project_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project / Billing Title" className="span-2">
            <input
              className="input"
              value={draft.project_name}
              onChange={(e) => set({ project_name: e.target.value })}
              placeholder="e.g. Kitchen Exhaust Hood — full billing"
            />
          </Field>
        </div>
      </div>

      <SectionHead title="Items & Pricing" code="Line entries" />
      <div className="card card-pad">
        <LineItemsEditor items={draft.items} onChange={(items) => set({ items })} />
        <div style={{ display: 'flex', marginTop: 16, gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 240 }} className="field-hint">
            When this invoice is saved, payment status and balances update automatically as payments
            are recorded.
          </div>
          <TotalsPanel
            items={draft.items}
            discount={draft.discount}
            taxRate={draft.tax_rate}
            onDiscount={(v) => set({ discount: v })}
            onTaxRate={(v) => set({ tax_rate: v })}
            grandLabel="Total"
          />
        </div>
      </div>

      <SectionHead title="Notes" code="Shown on print" />
      <div className="card card-pad">
        <Field label="Notes">
          <textarea className="input" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/invoices/${existing.id}` : '/invoices')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Invoice'}
        </Button>
      </div>

      <div className="muted small" style={{ marginTop: 10, textAlign: 'right' }}>
        Preview total:{' '}
        <b className="mono">
          {computeTotals(draft.items, draft.discount, draft.tax_rate).total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
        </b>
      </div>
    </div>
  )
}
