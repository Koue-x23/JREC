import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { QuotationStatus } from '../lib/types'
import { QUOTATION_STATUSES } from '../lib/types'
import { computeTotals, newLineItem } from '../lib/compute'
import { addDays, todayStr } from '../lib/format'
import { Button, Field, PageHeader, SectionHead } from '../components/ui'
import { LineItemsEditor, TotalsPanel } from '../components/forms/LineItems'

interface Draft {
  date: string
  valid_until: string
  customer_id: string
  project_name: string
  description: string
  items: { id: string; description: string; quantity: number; unit: string; unit_price: number }[]
  discount: number
  tax_rate: number
  notes: string
  terms: string
  status: QuotationStatus
}

export default function QuotationEditor() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const { data, createQuotation, updateQuotation } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const existing = id ? data.quotations.find((q) => q.id === id) : undefined

  const makeDraft = (): Draft => {
    if (existing) {
      return {
        date: existing.date,
        valid_until: existing.valid_until,
        customer_id: existing.customer_id,
        project_name: existing.project_name,
        description: existing.description,
        items: existing.items.map((it) => ({ ...it })),
        discount: existing.discount,
        tax_rate: existing.tax_rate,
        notes: existing.notes,
        terms: existing.terms || data.settings.quotation_terms,
        status: existing.status,
      }
    }
    const today = todayStr()
    const fromQuery = params.get('customer') ?? ''
    return {
      date: today,
      valid_until: addDays(today, data.settings.quotation_valid_days || 30),
      customer_id: fromQuery,
      project_name: '',
      description: '',
      items: [newLineItem()],
      discount: 0,
      tax_rate: data.settings.tax_rate,
      notes: '',
      terms: data.settings.quotation_terms,
      status: 'Draft',
    }
  }

  const [draft, setDraft] = useState<Draft>(makeDraft)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    // Wait for data load before initializing the draft.
    setDraft(makeDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, data.settings, params.get('customer')])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const nextNumberPreview = useMemo(() => {
    const seq = data.settings.sequences.QUO
    return `${seq.prefix}-${String(seq.next).padStart(5, '0')}`
  }, [data.settings.sequences.QUO])

  const customerError = touched && !draft.customer_id ? 'Select a customer.' : ''
  const itemsError =
    touched && draft.items.filter((i) => i.description.trim()).length === 0
      ? 'Add at least one item with a description.'
      : ''

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
        date: draft.date,
        valid_until: draft.valid_until,
        customer_id: draft.customer_id,
        project_name: draft.project_name.trim() || 'Untitled project',
        description: draft.description,
        items: cleanItems,
        discount: draft.discount,
        tax_rate: draft.tax_rate,
        notes: draft.notes,
        terms: draft.terms,
        status: draft.status,
      }
      if (existing) {
        await updateQuotation(existing.id, payload)
        toast.success(`${existing.number} updated.`)
        navigate(`/quotations/${existing.id}`)
      } else {
        const created = await createQuotation(payload)
        toast.success(`Quotation ${created.number} saved.`)
        navigate(`/quotations/${created.id}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker={existing ? `Module 03 · Edit ${existing.number}` : 'Module 03 · New document'}
        title={existing ? 'Edit Quotation' : 'New Quotation'}
        sub={
          existing
            ? `Editing ${existing.number} — customer and project carry over automatically`
            : `Will be numbered ${nextNumberPreview} on save`
        }
      >
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/quotations/${existing.id}` : '/quotations')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Quotation'}
        </Button>
      </PageHeader>

      <div className="card card-pad">
        <div className="form-grid">
          <Field label="Quotation Date" required>
            <input
              className="input"
              type="date"
              value={draft.date}
              onChange={(e) => {
                const date = e.target.value
                set({
                  date,
                  valid_until: addDays(date, data.settings.quotation_valid_days || 30),
                })
              }}
            />
          </Field>
          <Field label="Valid Until" required>
            <input
              className="input"
              type="date"
              value={draft.valid_until}
              onChange={(e) => set({ valid_until: e.target.value })}
            />
          </Field>
          <Field label="Customer" required error={customerError}>
            <select value={draft.customer_id} onChange={(e) => set({ customer_id: e.target.value })}>
              <option value="">— Select customer —</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''} ({c.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={draft.status} onChange={(e) => set({ status: e.target.value as QuotationStatus })}>
              {QUOTATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project Name" className="span-2">
            <input
              className="input"
              value={draft.project_name}
              onChange={(e) => set({ project_name: e.target.value })}
              placeholder="e.g. Kitchen Exhaust Hood & Ducting — Type 304"
            />
          </Field>
          <Field label="Project Description" className="span-2">
            <textarea
              className="input"
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Short scope summary shown on the printed quotation"
            />
          </Field>
        </div>
      </div>

      <SectionHead title="Items & Pricing" code="Line entries" />
      <div className="card card-pad">
        <LineItemsEditor items={draft.items} onChange={(items) => set({ items })} />
        <div style={{ display: 'flex', marginTop: 16, gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            {itemsError && <div className="field-error" style={{ marginBottom: 8 }}>{itemsError}</div>}
            <div className="field-hint">
              Amounts compute automatically. Discount and tax apply on the right.
            </div>
          </div>
          <TotalsPanel
            items={draft.items}
            discount={draft.discount}
            taxRate={draft.tax_rate}
            onDiscount={(v) => set({ discount: v })}
            onTaxRate={(v) => set({ tax_rate: v })}
          />
        </div>
      </div>

      <SectionHead title="Notes & Terms" code="Shown on print" />
      <div className="card card-pad">
        <div className="form-grid">
          <Field label="Notes" className="span-2">
            <textarea
              className="input"
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Site visit notes, coordination, exclusions…"
            />
          </Field>
          <Field label="Terms & Conditions" className="span-2">
            <textarea
              className="input"
              style={{ minHeight: 130 }}
              value={draft.terms}
              onChange={(e) => set({ terms: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(existing ? `/quotations/${existing.id}` : '/quotations')}>
          Cancel
        </Button>
        <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save Changes' : 'Save Quotation'}
        </Button>
      </div>

      <div className="muted small" style={{ marginTop: 10, textAlign: 'right' }}>
        Preview total: <b className="mono">{computeTotals(draft.items, draft.discount, draft.tax_rate).total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</b>
      </div>
    </div>
  )
}
