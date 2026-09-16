import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { addMonths, todayStr } from '../../lib/format'
import { Button, Field, Modal } from '../ui'

export interface StatementFormValues {
  customerId: string
  periodStart: string
  periodEnd: string
  adjustments: { description: string; amount: number }[]
  notes: string
}

export function StatementForm({
  open,
  onClose,
  onSubmit,
  customers,
  currentBalances,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: StatementFormValues) => Promise<void> | void
  customers: { id: string; name: string; company: string }[]
  currentBalances: (customerId: string) => number
}) {
  const firstOfMonth = `${todayStr().slice(0, 7)}-01`
  const [values, setValues] = useState<StatementFormValues>({
    customerId: '',
    periodStart: addMonths(firstOfMonth, -1),
    periodEnd: todayStr(),
    adjustments: [],
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setTouched(false)
      setValues({
        customerId: '',
        periodStart: addMonths(firstOfMonth, -1),
        periodEnd: todayStr(),
        adjustments: [],
        notes: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (patch: Partial<StatementFormValues>) => setValues((v) => ({ ...v, ...patch }))

  const submit = async () => {
    setTouched(true)
    if (!values.customerId) return
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  const balance = values.customerId ? currentBalances(values.customerId) : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Billing Statement"
      subtitle="Summarizes invoices, payments and adjustments for a customer within a period"
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Generating…' : 'Generate Statement'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Customer" required error={touched && !values.customerId ? 'Select a customer.' : ''}>
          <select className="input" value={values.customerId} onChange={(e) => set({ customerId: e.target.value })}>
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statement Date" hint="Defaults to today">
          <input className="input" type="date" value={values.periodEnd} onChange={(e) => set({ periodEnd: e.target.value })} />
        </Field>
        <Field label="Period Start" required>
          <input className="input" type="date" value={values.periodStart} onChange={(e) => set({ periodStart: e.target.value })} />
        </Field>
        <Field label="Period End" required>
          <input className="input" type="date" value={values.periodEnd} onChange={(e) => set({ periodEnd: e.target.value })} />
        </Field>

        <Field label="Adjustments" className="span-2" hint="Penalties, credits, corrections — positive adds to the balance, negative subtracts.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {values.adjustments.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 34px', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Description (e.g. late payment penalty)"
                  value={a.description}
                  onChange={(e) =>
                    set({
                      adjustments: values.adjustments.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                    })
                  }
                />
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="± amount"
                  value={a.amount || ''}
                  onChange={(e) =>
                    set({
                      adjustments: values.adjustments.map((x, j) =>
                        j === i ? { ...x, amount: Number(e.target.value) || 0 } : x,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="ie-remove"
                  style={{ height: 38, border: '1px solid var(--steel-200)', borderRadius: 8 }}
                  onClick={() => set({ adjustments: values.adjustments.filter((_, j) => j !== i) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => set({ adjustments: [...values.adjustments, { description: '', amount: 0 }] })}
            >
              Add Adjustment
            </Button>
          </div>
        </Field>

        <Field label="Notes" className="span-2">
          <textarea
            className="input"
            value={values.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Shown on the printed statement"
          />
        </Field>

        {values.customerId && (
          <div className="span-2" style={{ background: 'var(--steel-50)', border: '1px solid var(--steel-100)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--steel-600)' }}>
            Current outstanding balance of this customer (before this statement):{' '}
            <b className="mono" style={{ color: balance > 0 ? 'var(--red)' : 'var(--ok)' }}>
              ₱{balance.toLocaleString()}
            </b>
          </div>
        )}
      </div>
    </Modal>
  )
}
