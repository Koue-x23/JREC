import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  UserRound,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { computeTotals, quotationStatusOf } from '../lib/compute'
import { fmtDate, money } from '../lib/format'
import { customerStats, invoiceViews } from '../lib/selectors'
import { Button, EmptyState, LoadingPanel, StatusBadge } from '../components/ui'
import { CustomerForm, type CustomerFormValues } from '../components/forms/CustomerForm'

type TabKey = 'overview' | 'quotations' | 'jobs' | 'service' | 'invoices' | 'payments' | 'statements'

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, updateCustomer } = useData()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('overview')
  const [editOpen, setEditOpen] = useState(false)

  const customer = data.customers.find((c) => c.id === id)

  const everything = useMemo(() => {
    if (!customer) return null
    const views = invoiceViews(data)
    return {
      stats: customerStats(data, customer.id),
      quotations: data.quotations
        .filter((q) => q.customer_id === customer.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
      jobs: data.jobs
        .filter((j) => j.customer_id === customer.id)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
      service: data.service_reports
        .filter((s) => s.customer_id === customer.id)
        .sort((a, b) => b.service_date.localeCompare(a.service_date)),
      invoices: views
        .filter((v) => v.customer_id === customer.id)
        .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)),
      payments: data.payments
        .filter((p) => p.customer_id === customer.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
      statements: data.statements
        .filter((s) => s.customer_id === customer.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    }
  }, [customer, data])

  if (loading) return <LoadingPanel label="Loading customer…" />

  if (!customer || !everything) {
    return (
      <div className="page">
        <EmptyState
          icon={<UserRound size={22} />}
          title="Customer not found"
          hint="The record may have been deleted."
          action={
            <Link to="/customers" className="btn btn-secondary">
              <ChevronLeft size={15} /> Back to customers
            </Link>
          }
        />
      </div>
    )
  }

  const { stats } = everything
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'quotations', label: 'Quotations', count: everything.quotations.length },
    { key: 'jobs', label: 'Jobs', count: everything.jobs.length },
    { key: 'service', label: 'Service Reports', count: everything.service.length },
    { key: 'invoices', label: 'Invoices', count: everything.invoices.length },
    { key: 'payments', label: 'Payments', count: everything.payments.length },
    { key: 'statements', label: 'Statements', count: everything.statements.length },
  ]

  const submitEdit = async (values: CustomerFormValues) => {
    try {
      await updateCustomer(customer.id, values)
      toast.success('Customer updated.')
      setEditOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update customer.')
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 14 }}>
        <Link to="/customers" className="btn btn-ghost btn-sm">
          <ChevronLeft size={14} /> All customers
        </Link>
      </div>

      <div className="profile-band">
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="pb-name">{customer.name || customer.company}</div>
            {customer.company && customer.name && <div className="pb-company">{customer.company}</div>}
            <div className="pb-meta">
              <span>
                <UserRound size={13} /> {customer.code}
              </span>
              {customer.phone && (
                <span>
                  <Phone size={13} /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span>
                  <Mail size={13} /> {customer.email}
                </span>
              )}
              {customer.address && (
                <span>
                  <MapPin size={13} /> {customer.address}
                </span>
              )}
              <span className="mono" style={{ fontSize: 11 }}>
                Added {fmtDate(customer.date_added)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              size="sm"
              icon={<Pencil size={14} />}
              onClick={() => setEditOpen(true)}
              className="btn-steel"
            >
              Edit
            </Button>
            <Link to={`/quotations/new?customer=${customer.id}`} className="btn btn-primary btn-sm">
              <FileText size={14} /> New Quotation
            </Link>
          </div>
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="ps-label">Total Business</div>
            <div className="ps-value">{money(stats.totalSales)}</div>
          </div>
          <div className="profile-stat">
            <div className="ps-label">Total Paid</div>
            <div className="ps-value">{money(stats.totalPaid)}</div>
          </div>
          <div className="profile-stat">
            <div className="ps-label">Outstanding</div>
            <div className="ps-value" style={{ color: stats.outstanding > 0 ? '#ff8f8f' : undefined }}>
              {money(stats.outstanding)}
            </div>
          </div>
          <div className="profile-stat">
            <div className="ps-label">Last Activity</div>
            <div className="ps-value" style={{ fontSize: 15 }}>
              {stats.lastActivity ? fmtDate(stats.lastActivity) : '—'}
            </div>
          </div>
        </div>
      </div>

      {customer.notes && (
        <div className="note-block red-edge" style={{ marginTop: 14 }}>
          {customer.notes}
        </div>
      )}

      <div className="tab-bar" style={{ marginTop: 20 }}>
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card card-pad">
          {everything.quotations.length === 0 && everything.jobs.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="No transactions yet"
              hint="Create the first quotation for this customer — jobs, invoices and payments can flow from it."
              action={
                <Link to={`/quotations/new?customer=${customer.id}`} className="btn btn-primary">
                  <FileText size={15} /> New Quotation
                </Link>
              }
            />
          ) : (
            <div className="dash-recent">
              <MiniList
                title="Latest quotations"
                rows={everything.quotations.slice(0, 4).map((q) => ({
                  id: q.id,
                  num: q.number,
                  title: q.project_name,
                  sub: fmtDate(q.date),
                  badge: quotationStatusOf(q),
                  amount: computeTotals(q.items, q.discount, q.tax_rate).total,
                  to: `/quotations/${q.id}`,
                }))}
              />
              <MiniList
                title="Latest jobs"
                rows={everything.jobs.slice(0, 4).map((j) => ({
                  id: j.id,
                  num: j.number,
                  title: j.project_name,
                  sub: fmtDate(j.start_date),
                  badge: j.status,
                  to: `/jobs/${j.id}`,
                }))}
              />
              <MiniList
                title="Latest invoices"
                rows={everything.invoices.slice(0, 4).map((v) => ({
                  id: v.id,
                  num: v.number,
                  title: v.project_name,
                  sub: `Due ${fmtDate(v.due_date)}`,
                  badge: v.status,
                  amount: v.total,
                  to: `/invoices/${v.id}`,
                }))}
              />
              <MiniList
                title="Latest payments"
                rows={everything.payments.slice(0, 4).map((p) => ({
                  id: p.id,
                  num: p.number,
                  title: `${p.method}${p.reference ? ` · ${p.reference}` : ''}`,
                  sub: fmtDate(p.date),
                  amount: p.amount,
                  to: `/payments`,
                }))}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'quotations' && (
        <HistoryTable
          empty="No quotations for this customer yet."
          rows={everything.quotations.map((q) => ({
            id: q.id,
            cols: [
              q.number,
              q.project_name,
              fmtDate(q.date),
              quotationStatusOf(q),
              computeTotals(q.items, q.discount, q.tax_rate).total,
            ],
            to: `/quotations/${q.id}`,
          }))}
          headers={['Number', 'Project', 'Date', 'Status', 'Total']}
        />
      )}

      {tab === 'jobs' && (
        <HistoryTable
          empty="No jobs for this customer yet."
          rows={everything.jobs.map((j) => ({
            id: j.id,
            cols: [j.number, j.project_name, j.fabricator || '—', fmtDate(j.start_date), j.status],
            to: `/jobs/${j.id}`,
          }))}
          headers={['Number', 'Project', 'Fabricator', 'Started', 'Status']}
        />
      )}

      {tab === 'service' && (
        <HistoryTable
          empty="No service reports for this customer yet."
          rows={everything.service.map((s) => ({
            id: s.id,
            cols: [s.number, s.item_product || s.problem_request, s.technician || '—', fmtDate(s.service_date), s.status],
            to: `/service-reports/${s.id}`,
          }))}
          headers={['Number', 'Item / Request', 'Technician', 'Date', 'Status']}
        />
      )}

      {tab === 'invoices' && (
        <HistoryTable
          empty="No invoices for this customer yet."
          rows={everything.invoices.map((v) => ({
            id: v.id,
            cols: [v.number, v.project_name, `${money(v.paid)} / ${money(v.total)}`, fmtDate(v.due_date), v.status],
            to: `/invoices/${v.id}`,
          }))}
          headers={['Number', 'Project', 'Paid / Total', 'Due', 'Status']}
        />
      )}

      {tab === 'payments' && (
        <HistoryTable
          empty="No payments recorded for this customer yet."
          rows={everything.payments.map((p) => {
            const inv = data.invoices.find((i) => i.id === p.invoice_id)
            return {
              id: p.id,
              cols: [p.number, inv?.number ?? '—', p.method, p.reference || '—', fmtDate(p.date), p.amount],
              to: `/payments`,
            }
          })}
          headers={['Number', 'Invoice', 'Method', 'Reference', 'Date', 'Amount']}
        />
      )}

      {tab === 'statements' && (
        <HistoryTable
          empty="No billing statements generated for this customer yet."
          rows={everything.statements.map((b) => ({
            id: b.id,
            cols: [
              b.number,
              `${fmtDate(b.period_start)} – ${fmtDate(b.period_end)}`,
              fmtDate(b.date),
              b.current_balance,
            ],
            to: `/billing-statements/${b.id}`,
          }))}
          headers={['Number', 'Period', 'Generated', 'Balance']}
        />
      )}

      <CustomerForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={submitEdit}
        initial={customer}
        title="Edit Customer"
        subtitle={`${customer.code} — update details`}
      />
    </div>
  )
}

function MiniList({
  title,
  rows,
}: {
  title: string
  rows: { id: string; num: string; title: string; sub: string; badge?: string; amount?: number; to: string }[]
}) {
  const navigate = useNavigate()
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '11px 16px',
          borderBottom: '1px solid var(--steel-100)',
          font: "700 12.5px var(--font-head)",
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--steel-700)',
        }}
      >
        {title}
      </div>
      {rows.length === 0 && (
        <div style={{ padding: '16px', color: 'var(--steel-400)', fontSize: 12.5 }}>Nothing here yet.</div>
      )}
      {rows.map((r) => (
        <div key={r.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => navigate(r.to)}>
          <span className="rr-num" style={{ font: '600 11.5px var(--font-mono)', background: 'var(--steel-50)', border: '1px solid var(--steel-200)', borderRadius: 5, padding: '3px 7px' }}>
            {r.num}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.title || '—'}
            </span>
            <span className="muted small">{r.sub}</span>
          </span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {r.badge && <StatusBadge status={r.badge} />}
            {r.amount !== undefined && (
              <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>
                {money(r.amount)}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function HistoryTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: { id: string; cols: (string | number)[]; to: string }[]
  empty: string
}) {
  const navigate = useNavigate()
  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<Receipt size={22} />} title="Nothing here" hint={empty} />
      </div>
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table responsive">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={i === headers.length - 1 && headers.length === 5 && typeof rows[0]?.cols[i] === 'number' ? 'right' : ''}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="clickable" onClick={() => navigate(r.to)}>
              {r.cols.map((c, i) => (
                <td key={i} data-label={headers[i]} className={i === 0 ? 'col-num' : typeof c === 'number' ? 'col-money' : ''}>
                  {typeof c === 'number' ? money(c) : typeof c === 'string' && ['Draft','Sent','Pending','Approved','Rejected','Expired','In Progress','On Hold','Completed','Cancelled','Unpaid','Partially Paid','Paid','Overdue'].includes(c) ? <StatusBadge status={c} /> : c || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
