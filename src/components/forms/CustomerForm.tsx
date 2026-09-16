import { useEffect, useState } from 'react'
import type { Customer } from '../../lib/types'
import { todayStr } from '../../lib/format'
import { Button, Field, Modal } from '../ui'

export interface CustomerFormValues {
  name: string
  company: string
  phone: string
  email: string
  address: string
  contact_person: string
  notes: string
  date_added: string
}

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  contact_person: '',
  notes: '',
  date_added: todayStr(),
}

export function CustomerForm({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  subtitle,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: CustomerFormValues) => Promise<void> | void
  initial?: Customer | null
  title: string
  subtitle?: string
}) {
  const [values, setValues] = useState<CustomerFormValues>(EMPTY_CUSTOMER)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setTouched(false)
      if (initial) {
        setValues({
          name: initial.name,
          company: initial.company,
          phone: initial.phone,
          email: initial.email,
          address: initial.address,
          contact_person: initial.contact_person,
          notes: initial.notes,
          date_added: initial.date_added,
        })
      } else {
        setValues(EMPTY_CUSTOMER)
      }
    }
  }, [open, initial])

  const set = (patch: Partial<CustomerFormValues>) => setValues((v) => ({ ...v, ...patch }))

  const submit = async () => {
    setTouched(true)
    if (!values.name.trim() && !values.company.trim()) return
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  const nameError =
    touched && !values.name.trim() && !values.company.trim()
      ? 'Enter a customer name or company name.'
      : undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save Customer'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Customer Name" required error={nameError}>
          <input
            className="input"
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Marina Dela Cruz"
            autoFocus
          />
        </Field>
        <Field label="Company Name">
          <input
            className="input"
            value={values.company}
            onChange={(e) => set({ company: e.target.value })}
            placeholder="e.g. Marina's Grill & Restaurant"
          />
        </Field>
        <Field label="Phone">
          <input
            className="input"
            value={values.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="09xx xxx xxxx"
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={values.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="name@email.com"
          />
        </Field>
        <Field label="Address" className="span-2">
          <input
            className="input"
            value={values.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Street, Barangay, City"
          />
        </Field>
        <Field label="Contact Person">
          <input
            className="input"
            value={values.contact_person}
            onChange={(e) => set({ contact_person: e.target.value })}
            placeholder="Who to look for"
          />
        </Field>
        <Field label="Date Added">
          <input
            className="input"
            type="date"
            value={values.date_added}
            onChange={(e) => set({ date_added: e.target.value })}
          />
        </Field>
        <Field label="Notes" className="span-2" hint="Finish preferences, schedule, anything useful.">
          <textarea
            className="input"
            value={values.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Preferences, history, reminders…"
          />
        </Field>
      </div>
    </Modal>
  )
}
