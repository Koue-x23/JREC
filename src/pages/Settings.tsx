import { useRef, useState } from 'react'
import {
  Building2,
  Database,
  DownloadCloud,
  FileStack,
  Hash,
  Save,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { BusinessSettings as Settings, SequenceKey } from '../lib/types'
import {
  Button,
  ConfirmDialog,
  Field,
  LoadingPanel,
  PageHeader,
} from '../components/ui'
import { LogoMark } from '../components/LogoMark'

type Tab = 'business' | 'documents' | 'numbering' | 'data'

const SEQ_LABEL: Record<SequenceKey, string> = {
  CUST: 'Customers',
  QUO: 'Quotations',
  JOB: 'Jobs',
  SR: 'Service Reports',
  INV: 'Invoices',
  PAY: 'Payments',
  BS: 'Billing Statements',
}

export default function Settings() {
  const { data, loading, saveSettings, store, clearAllData, resetToSample, exportBackup, importBackup } = useData()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('business')
  const [draft, setDraft] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<null | 'clear' | 'sample'>(null)

  if (loading) return <LoadingPanel label="Loading settings…" />

  const s = draft ?? data.settings
  const set = (patch: Partial<Settings>) => setDraft({ ...s, ...patch })

  const save = async () => {
    setBusy(true)
    try {
      await saveSettings(s)
      setDraft(null)
      toast.success('Settings saved.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jrec-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded.')
  }

  const importJson = async (file: File) => {
    try {
      const text = await file.text()
      await importBackup(text)
      toast.success('Backup restored.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not restore backup.')
    }
  }

  const uploadLogo = (file: File) => {
    if (file.size > 400_000) {
      toast.error('Logo is too large — please use an image under 400 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      set({ logo: String(reader.result) })
      toast.info('Logo staged — click Save Settings to apply.')
    }
    reader.readAsDataURL(file)
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'business', label: 'Business Information', icon: <Building2 size={15} /> },
    { key: 'documents', label: 'Document Defaults', icon: <FileStack size={15} /> },
    { key: 'numbering', label: 'Numbering Sequences', icon: <Hash size={15} /> },
    { key: 'data', label: 'Data & Backup', icon: <Database size={15} /> },
  ]

  return (
    <div className="page">
      <PageHeader
        kicker="Module 10 · Configuration"
        title="Settings"
        sub="Business identity, document defaults, numbering and data management"
      >
        {tab !== 'data' && (
          <>
            {draft && (
              <Button icon={<X size={15} />} onClick={() => setDraft(null)} disabled={busy}>
                Discard
              </Button>
            )}
            <Button variant="primary" icon={<Save size={15} />} onClick={save} disabled={busy || !draft}>
              {busy ? 'Saving…' : 'Save Settings'}
            </Button>
          </>
        )}
      </PageHeader>

      <div className="settings-nav">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <div className="card card-pad">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            {s.logo ? (
              <img src={s.logo} alt="Logo" style={{ height: 64, width: 64, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 10, padding: 6 }} />
            ) : (
              <LogoMark size={64} />
            )}
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>
                Business Logo
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                  <UploadCloud size={14} /> Upload logo
                </button>
                {s.logo && (
                  <button className="btn btn-ghost btn-sm" onClick={() => set({ logo: '' })}>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadLogo(f)
                  e.target.value = ''
                }}
              />
              <div className="field-hint" style={{ marginTop: 6 }}>
                Used on the sidebar and every printed document.
              </div>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Business Name" required>
              <input className="input" value={s.business_name} onChange={(e) => set({ business_name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={s.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Address" className="span-2">
              <input className="input" value={s.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Email" className="span-2">
              <input className="input" type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} placeholder="Displayed on documents if set" />
            </Field>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="card card-pad">
          <div className="form-grid">
            <Field label="Default Tax Rate (%)" hint="Applied to new quotations and invoices">
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={s.tax_rate}
                onChange={(e) => set({ tax_rate: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Quotation Validity (days)">
              <input
                className="input"
                type="number"
                min={1}
                value={s.quotation_valid_days}
                onChange={(e) => set({ quotation_valid_days: Number(e.target.value) || 30 })}
              />
            </Field>
            <Field label="Invoice Due (days)">
              <input
                className="input"
                type="number"
                min={1}
                value={s.invoice_due_days}
                onChange={(e) => set({ invoice_due_days: Number(e.target.value) || 15 })}
              />
            </Field>
            <div />
            <Field label="Default Quotation Terms & Conditions" className="span-2">
              <textarea
                className="input"
                style={{ minHeight: 150 }}
                value={s.quotation_terms}
                onChange={(e) => set({ quotation_terms: e.target.value })}
              />
            </Field>
            <Field label="Default Invoice Notes" className="span-2">
              <textarea className="input" value={s.invoice_notes} onChange={(e) => set({ invoice_notes: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {tab === 'numbering' && (
        <div className="card card-pad">
          <div className="field-hint" style={{ marginBottom: 14 }}>
            Document numbers increment automatically and never repeat. Adjust the next number here if
            you are migrating from a paper-based sequence.
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Prefix</th>
                  <th>Next Number</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(SEQ_LABEL) as SequenceKey[]).map((k) => {
                  const seq = s.sequences[k]
                  return (
                    <tr key={k}>
                      <td className="col-strong">{SEQ_LABEL[k]}</td>
                      <td>
                        <input
                          className="input"
                          style={{ width: 110, height: 34 }}
                          value={seq.prefix}
                          onChange={(e) =>
                            set({
                              sequences: {
                                ...s.sequences,
                                [k]: { ...seq, prefix: e.target.value.toUpperCase() },
                              },
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ width: 110, height: 34 }}
                          type="number"
                          min={1}
                          value={seq.next}
                          onChange={(e) =>
                            set({
                              sequences: {
                                ...s.sequences,
                                [k]: { ...seq, next: Math.max(1, Number(e.target.value) || 1) },
                              },
                            })
                          }
                        />
                      </td>
                      <td className="col-num">
                        {seq.prefix}-{String(seq.next).padStart(5, '0')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card card-pad">
            <div className="sec-head" style={{ marginTop: 0 }}>
              <span className="sec-mark" />
              <h2>Storage</h2>
            </div>
            <div className={`storage-chip ${store.kind === 'supabase' ? 'cloud' : ''}`}>
              <span className="dot" />
              <span>
                <b>{store.kind === 'supabase' ? 'Cloud database (Supabase)' : 'Local device storage'}</b>
                {' — '}
                {store.label}
              </span>
            </div>
            <p className="muted small" style={{ margin: '12px 0 0', lineHeight: 1.7 }}>
              {store.kind === 'supabase' ? (
                <>
                  Records are stored in your Supabase project and are available on every device.
                  No authentication is used — the database holds business data only.
                </>
              ) : (
                <>
                  Records are saved in this browser. To keep records synchronized across devices,
                  connect a Supabase cloud database: create a free project at{' '}
                  <b>supabase.com</b>, run the SQL in <b>supabase/schema.sql</b> (SQL editor), then
                  set <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> in a{' '}
                  <b>.env</b> file and rebuild. The system switches automatically — no code changes
                  and still no login.
                </>
              )}
            </p>
          </div>

          <div className="card card-pad">
            <div className="sec-head" style={{ marginTop: 0 }}>
              <span className="sec-mark" />
              <h2>Backup &amp; Restore</h2>
            </div>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              Export everything (customers, documents, payments, statements) as a single JSON file.
              Restore it on any device or database.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button icon={<DownloadCloud size={15} />} onClick={exportJson}>
                Download Backup
              </Button>
              <Button icon={<UploadCloud size={15} />} onClick={() => fileRef.current?.click()}>
                Restore Backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importJson(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div className="card card-pad">
            <div className="sec-head" style={{ marginTop: 0 }}>
              <span className="sec-mark" />
              <h2>Sample &amp; Reset</h2>
            </div>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              Load the built-in sample dataset (connected customers, quotations, jobs, reports,
              invoices, payments) to explore the system — or clear everything and start with a clean
              book for real operations.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button onClick={() => setConfirm('sample')}>Load Sample Data</Button>
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirm('clear')}>
                Clear All Data
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true)
          try {
            await clearAllData()
            toast.success('All records cleared. You now have a clean book.')
            setConfirm(null)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not clear data.')
          } finally {
            setBusy(false)
          }
        }}
        title="Clear all business records?"
        confirmLabel="Yes, clear everything"
        busy={busy}
        message={
          <>
            This deletes <b>all</b> customers, quotations, jobs, service reports, invoices, payments
            and billing statements. Download a backup first if you might need them. This cannot be
            undone.
          </>
        }
      />

      <ConfirmDialog
        open={confirm === 'sample'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true)
          try {
            await resetToSample()
            toast.success('Sample dataset loaded.')
            setConfirm(null)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not load sample data.')
          } finally {
            setBusy(false)
          }
        }}
        title="Load sample data?"
        confirmLabel="Load sample data"
        danger={false}
        busy={busy}
        message={
          <>
            This <b>replaces</b> current records with the demo dataset (a connected story of
            customers, quotations, jobs, service reports, invoices, payments and statements).
          </>
        }
      />
    </div>
  )
}
