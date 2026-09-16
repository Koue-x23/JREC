import { useMemo, useState } from 'react'
import {
  BarChart3,
  ClipboardList,
  FileText,
  HardHat,
  Printer,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { addDays, fmtDate, money, moneyShort, todayStr } from '../lib/format'
import { quotationStatusOf } from '../lib/compute'
import {
  customerReport,
  outstandingReport,
  overdueReport,
  paymentReport,
  salesReport,
  type ReportGranularity,
} from '../lib/selectors'
import {
  Button,
  DataTable,
  EmptyState,
  LoadingPanel,
  PageHeader,
  StatusBadge,
  type Column,
} from '../components/ui'
import { BarChart, DonutChart, HBarChart } from '../components/charts'

type ReportType =
  | 'sales'
  | 'payments'
  | 'receivables'
  | 'overdue'
  | 'customers'
  | 'jobs'
  | 'quotations'
  | 'service'

const REPORTS: { key: ReportType; label: string; icon: React.ReactNode; ranged: boolean }[] = [
  { key: 'sales', label: 'Sales Report', icon: <Receipt size={15} />, ranged: true },
  { key: 'payments', label: 'Payment Report', icon: <Wallet size={15} />, ranged: true },
  { key: 'receivables', label: 'Outstanding Receivables', icon: <BarChart3 size={15} />, ranged: false },
  { key: 'overdue', label: 'Overdue Invoices', icon: <BarChart3 size={15} />, ranged: false },
  { key: 'customers', label: 'Customer Report', icon: <Users size={15} />, ranged: true },
  { key: 'jobs', label: 'Job Report', icon: <HardHat size={15} />, ranged: true },
  { key: 'quotations', label: 'Quotation Report', icon: <FileText size={15} />, ranged: true },
  { key: 'service', label: 'Service Report', icon: <ClipboardList size={15} />, ranged: true },
]

export default function Reports() {
  const { data, loading } = useData()
  const [type, setType] = useState<ReportType>('sales')
  const [from, setFrom] = useState(addDays(todayStr(), -182))
  const [to, setTo] = useState(todayStr())
  const [customerId, setCustomerId] = useState('')
  const [granularity, setGranularity] = useState<ReportGranularity>('Monthly')

  const cust = (id: string) => data.customers.find((c) => c.id === id)?.name ?? '—'
  const active = REPORTS.find((r) => r.key === type)!

  const sales = useMemo(() => salesReport(data, from, to, customerId || undefined, granularity), [data, from, to, customerId, granularity])
  const pays = useMemo(() => paymentReport(data, from, to, customerId || undefined, granularity), [data, from, to, customerId, granularity])
  const receivables = useMemo(() => outstandingReport(data), [data])
  const overdue = useMemo(() => overdueReport(data), [data])
  const custRows = useMemo(() => customerReport(data, from, to), [data, from, to])

  const jobRows = useMemo(
    () =>
      data.jobs
        .filter((j) => j.start_date >= from && j.start_date <= to && (!customerId || j.customer_id === customerId))
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [data, from, to, customerId],
  )
  const quoRows = useMemo(
    () =>
      data.quotations
        .filter((q) => q.date >= from && q.date <= to && (!customerId || q.customer_id === customerId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data, from, to, customerId],
  )
  const srRows = useMemo(
    () =>
      data.service_reports
        .filter((s) => s.service_date >= from && s.service_date <= to && (!customerId || s.customer_id === customerId))
        .sort((a, b) => b.service_date.localeCompare(a.service_date)),
    [data, from, to, customerId],
  )

  const rangeLabel = active.ranged ? `${fmtDate(from)} — ${fmtDate(to)}` : `As of ${fmtDate(todayStr())}`

  const summaryCards = () => {
    switch (type) {
      case 'sales':
        return [
          { label: 'Total Sales', value: money(sales.total), sub: `${sales.count} invoice(s)` },
          { label: 'Collected', value: money(sales.paid), sub: 'Payments applied' },
          { label: 'Outstanding', value: money(sales.balance), sub: 'From these invoices' },
          { label: 'Average Invoice', value: money(sales.count ? sales.total / sales.count : 0), sub: 'Per document' },
        ]
      case 'payments':
        return [
          { label: 'Total Collected', value: money(pays.total), sub: `${pays.count} payment(s)` },
          { label: 'Cash', value: money(pays.byMethod.find((m) => m.label === 'Cash')?.total ?? 0), sub: 'Cash on hand' },
          { label: 'Digital', value: money(pays.byMethod.filter((m) => m.label !== 'Cash' && m.label !== 'Other').reduce((s, m) => s + m.total, 0)), sub: 'GCash + Bank' },
          { label: 'Largest Payment', value: money(Math.max(0, ...pays.rows.map((r) => r.amount))), sub: 'Single record' },
        ]
      case 'receivables':
        return [
          { label: 'Total Receivables', value: money(receivables.reduce((s, v) => s + v.balance, 0)), sub: `${receivables.length} invoice(s)` },
          { label: 'Largest Balance', value: money(Math.max(0, ...receivables.map((v) => v.balance))), sub: 'Single invoice' },
          { label: 'Customers Involved', value: new Set(receivables.map((v) => v.customer_id)).size, sub: 'Owing' },
          { label: 'Oldest Due Date', value: receivables.length ? fmtDate(receivables[0].due_date) : '—', sub: 'Earliest' },
        ]
      case 'overdue':
        return [
          { label: 'Overdue Amount', value: money(overdue.reduce((s, v) => s + v.balance, 0)), sub: `${overdue.length} invoice(s)` },
          { label: 'Longest Overdue', value: `${Math.max(0, ...overdue.map((v) => v.daysOverdue))} days`, sub: 'Past due' },
          { label: 'Customers', value: new Set(overdue.map((v) => v.customer_id)).size, sub: 'With overdue' },
          { label: 'Average Days Late', value: Math.round(overdue.reduce((s, v) => s + v.daysOverdue, 0) / (overdue.length || 1)), sub: 'Per invoice' },
        ]
      case 'customers':
        return [
          { label: 'Customers', value: custRows.length, sub: 'On file' },
          { label: 'Sales in Range', value: money(custRows.reduce((s, r) => s + r.sales, 0)), sub: 'Invoiced' },
          { label: 'Payments in Range', value: money(custRows.reduce((s, r) => s + r.payments, 0)), sub: 'Collected' },
          { label: 'Total Outstanding', value: money(custRows.reduce((s, r) => s + r.outstanding, 0)), sub: 'All customers' },
        ]
      case 'jobs':
        return [
          { label: 'Jobs Started', value: jobRows.length, sub: 'Within range' },
          { label: 'Completed', value: jobRows.filter((j) => j.status === 'Completed').length, sub: 'Finished' },
          { label: 'In Progress', value: jobRows.filter((j) => j.status === 'In Progress').length, sub: 'Active' },
          { label: 'On Hold / Cancelled', value: jobRows.filter((j) => j.status === 'On Hold' || j.status === 'Cancelled').length, sub: 'Attention' },
        ]
      case 'quotations':
        return [
          { label: 'Quotations', value: quoRows.length, sub: 'Within range' },
          { label: 'Approved', value: quoRows.filter((q) => quotationStatusOf(q) === 'Approved').length, sub: 'Won' },
          { label: 'Win Rate', value: `${Math.round((quoRows.filter((q) => quotationStatusOf(q) === 'Approved').length / (quoRows.filter((q) => ['Approved', 'Rejected', 'Expired'].includes(quotationStatusOf(q))).length || 1)) * 100)}%`, sub: 'Of decided quotes' },
          { label: 'Awaiting Decision', value: quoRows.filter((q) => ['Draft', 'Sent', 'Pending'].includes(quotationStatusOf(q))).length, sub: 'Follow up' },
        ]
      case 'service':
        return [
          { label: 'Service Reports', value: srRows.length, sub: 'Within range' },
          { label: 'Completed', value: srRows.filter((s) => s.status === 'Completed').length, sub: 'Done' },
          { label: 'In Progress', value: srRows.filter((s) => s.status === 'In Progress').length, sub: 'Ongoing' },
          {
            label: 'Technicians',
            value: new Set(srRows.map((s) => s.technician).filter(Boolean)).size,
            sub: 'Deployed',
          },
        ]
      default:
        return []
    }
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Module 09 · Analytics"
        title="Reports"
        sub="Sales, collections, receivables and operations — filter by date range and customer"
      >
        <Button variant="steel" icon={<Printer size={15} />} onClick={() => window.print()}>
          Print Report
        </Button>
      </PageHeader>

      <div className="settings-nav no-print" role="tablist">
        {REPORTS.map((r) => (
          <button key={r.key} className={type === r.key ? 'on' : ''} onClick={() => setType(r.key)}>
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      <div className="toolbar no-print">
        {active.ranged && (
          <>
            <div className="filter-field">
              <span className="small">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <span className="small">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="filter-field">
              <Users size={14} />
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">All customers</option>
                {data.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {(type === 'sales' || type === 'payments') && (
              <div className="filter-field">
                <BarChart3 size={14} />
                <select value={granularity} onChange={(e) => setGranularity(e.target.value as ReportGranularity)}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            )}
          </>
        )}
        {!active.ranged && (
          <span className="muted small">This report is a live snapshot — no date range needed.</span>
        )}
      </div>

      {loading ? (
        <LoadingPanel />
      ) : (
        <div className="report-sheet">
          <div className="report-head" style={{ marginBottom: 16, borderBottom: '2px solid var(--ink)', paddingBottom: 10 }}>
            <div style={{ font: '700 20px var(--font-head)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {active.label}
            </div>
            <div className="muted small" style={{ marginTop: 2 }}>
              {data.settings.business_name} · {rangeLabel}
              {customerId ? ` · ${cust(customerId)}` : ''}
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: 18 }}>
            {summaryCards().map((c) => (
              <div className="stat" key={c.label}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value money">{c.value}</div>
                <div className="stat-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          {type === 'sales' && (
            <>
              {sales.series.length > 0 && (
                <div className="chart-card" style={{ marginBottom: 18 }}>
                  <div className="chart-title">
                    <span className="sec-mark" /> Sales by {granularity === 'Daily' ? 'day' : granularity === 'Weekly' ? 'week' : granularity === 'Monthly' ? 'month' : 'year'}
                  </div>
                  <BarChart
                    data={sales.series.map((s) => ({ label: s.key.slice(5) || s.key, a: s.total }))}
                    aName="Sales"
                    height={190}
                  />
                </div>
              )}
              <InvoiceTable rows={sales.rows} />
            </>
          )}

          {type === 'payments' && (
            <>
              <div className="dash-grid" style={{ marginBottom: 18 }}>
                {pays.series.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-title">
                      <span className="sec-mark" /> Collections by period
                    </div>
                    <BarChart
                      data={pays.series.map((s) => ({ label: s.key.slice(5) || s.key, a: s.total }))}
                      aName="Payments"
                      aColor="#178a4e"
                      height={190}
                    />
                  </div>
                )}
                <div className="chart-card">
                  <div className="chart-title">
                    <span className="sec-mark" /> By payment method
                  </div>
                  <DonutChart
                    data={pays.byMethod.map((m) => ({
                      label: m.label,
                      value: m.total,
                      color:
                        m.label === 'Cash' ? '#6b7480' : m.label === 'GCash' ? '#1f61c2' : m.label === 'Bank Transfer' ? '#d92b2b' : '#b06e00',
                    }))}
                    centerLabel="Collected"
                    formatValue={(v) => moneyShort(v)}
                  />
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table responsive">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th className="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays.rows.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Number" className="col-num">{p.number}</td>
                        <td data-label="Date" className="small">{fmtDate(p.date)}</td>
                        <td data-label="Customer" className="col-strong">{cust(p.customer_id)}</td>
                        <td data-label="Invoice" className="col-num">{data.invoices.find((i) => i.id === p.invoice_id)?.number ?? '—'}</td>
                        <td data-label="Method"><span className="chip">{p.method}</span></td>
                        <td data-label="Reference" className="small mono">{p.reference || '—'}</td>
                        <td data-label="Amount" className="col-money" style={{ color: 'var(--ok)', fontWeight: 600 }}>{money(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pays.rows.length === 0 && <EmptyState icon={<Wallet size={22} />} title="No payments in this range" />}
              </div>
            </>
          )}

          {type === 'receivables' && (
            <>
              <div className="chart-card" style={{ marginBottom: 18 }}>
                <div className="chart-title">
                  <span className="sec-mark" /> Aging summary
                </div>
                <HBarChart
                  data={[
                    { label: 'Current', value: receivables.filter((v) => v.daysOverdue <= 0).reduce((s, v) => s + v.balance, 0), color: '#6b7480' },
                    { label: '1–30 days', value: receivables.filter((v) => v.daysOverdue > 0 && v.daysOverdue <= 30).reduce((s, v) => s + v.balance, 0), color: '#b06e00' },
                    { label: '31–60 days', value: receivables.filter((v) => v.daysOverdue > 30 && v.daysOverdue <= 60).reduce((s, v) => s + v.balance, 0), color: '#c14a00' },
                    { label: '60+ days', value: receivables.filter((v) => v.daysOverdue > 60).reduce((s, v) => s + v.balance, 0), color: '#d92b2b' },
                  ]}
                  formatValue={(v) => moneyShort(v)}
                />
              </div>
              <InvoiceTable rows={receivables} />
            </>
          )}

          {type === 'overdue' && <InvoiceTable rows={overdue} />}

          {type === 'customers' && (
            <div className="table-wrap">
              <table className="data-table responsive">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Invoices</th>
                    <th className="right">Sales (range)</th>
                    <th className="right">Payments (range)</th>
                    <th className="right">Outstanding (now)</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {custRows.map((r) => (
                    <tr key={r.customer.id}>
                      <td data-label="Customer" className="col-strong">
                        {r.customer.name}
                        {r.customer.company ? <div className="muted small">{r.customer.company}</div> : null}
                      </td>
                      <td data-label="Invoices" className="num">{r.invoices}</td>
                      <td data-label="Sales" className="col-money">{money(r.sales)}</td>
                      <td data-label="Payments" className="col-money" style={{ color: 'var(--ok)' }}>{money(r.payments)}</td>
                      <td data-label="Outstanding" className="col-money" style={{ color: r.outstanding > 0 ? 'var(--red)' : undefined, fontWeight: 600 }}>
                        {money(r.outstanding)}
                      </td>
                      <td data-label="Last activity" className="small">{r.lastActivity ? fmtDate(r.lastActivity) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {custRows.length === 0 && <EmptyState icon={<Users size={22} />} title="No customers on file" />}
            </div>
          )}

          {type === 'jobs' && (
            <div className="table-wrap">
              <table className="data-table responsive">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Project</th>
                    <th>Customer</th>
                    <th>Fabricator</th>
                    <th>Started</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((j) => (
                    <tr key={j.id}>
                      <td data-label="Number" className="col-num">{j.number}</td>
                      <td data-label="Project" className="col-strong">{j.project_name}</td>
                      <td data-label="Customer" className="small">{cust(j.customer_id)}</td>
                      <td data-label="Fabricator" className="small">{j.fabricator || '—'}</td>
                      <td data-label="Started" className="small">{fmtDate(j.start_date)}</td>
                      <td data-label="Status"><StatusBadge status={j.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobRows.length === 0 && <EmptyState icon={<HardHat size={22} />} title="No jobs started in this range" />}
            </div>
          )}

          {type === 'quotations' && (
            <div className="table-wrap">
              <table className="data-table responsive">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Project</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quoRows.map((q) => (
                    <tr key={q.id}>
                      <td data-label="Number" className="col-num">{q.number}</td>
                      <td data-label="Project" className="col-strong">{q.project_name}</td>
                      <td data-label="Customer" className="small">{cust(q.customer_id)}</td>
                      <td data-label="Date" className="small">{fmtDate(q.date)}</td>
                      <td data-label="Status"><StatusBadge status={quotationStatusOf(q)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quoRows.length === 0 && <EmptyState icon={<FileText size={22} />} title="No quotations in this range" />}
            </div>
          )}

          {type === 'service' && (
            <div className="table-wrap">
              <table className="data-table responsive">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Item / Request</th>
                    <th>Customer</th>
                    <th>Technician</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {srRows.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Number" className="col-num">{s.number}</td>
                      <td data-label="Item" className="col-strong">{s.item_product || s.problem_request}</td>
                      <td data-label="Customer" className="small">{cust(s.customer_id)}</td>
                      <td data-label="Technician" className="small">{s.technician || '—'}</td>
                      <td data-label="Date" className="small">{fmtDate(s.service_date)}</td>
                      <td data-label="Status"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {srRows.length === 0 && <EmptyState icon={<ClipboardList size={22} />} title="No service reports in this range" />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InvoiceTable({
  rows,
}: {
  rows: {
    id: string
    number: string
    customer_name: string
    project_name: string
    invoice_date: string
    due_date: string
    total: number
    paid: number
    balance: number
    status: string
    daysOverdue: number
  }[]
}) {
  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState icon={<Receipt size={22} />} title="No invoices to show" hint="Try widening the date range." />
      </div>
    )
  }
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'number', header: 'Number', label: 'Number', render: (r) => <span className="col-num">{r.number}</span> },
    {
      key: 'customer',
      header: 'Customer / Project',
      label: 'Customer',
      render: (r) => (
        <div>
          <div className="col-strong">{r.customer_name}</div>
          <div className="muted small">{r.project_name}</div>
        </div>
      ),
    },
    { key: 'issued', header: 'Issued', label: 'Issued', render: (r) => <span className="small nowrap">{fmtDate(r.invoice_date)}</span> },
    { key: 'due', header: 'Due', label: 'Due', render: (r) => <span className="small nowrap">{fmtDate(r.due_date)}</span> },
    { key: 'total', header: 'Total', label: 'Total', render: (r) => <span className="col-money">{money(r.total)}</span> },
    {
      key: 'balance',
      header: 'Balance',
      label: 'Balance',
      render: (r) => (
        <span className="col-money" style={{ color: r.balance > 0 ? 'var(--red)' : 'var(--ok)', fontWeight: 600 }}>
          {money(r.balance)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]
  return <DataTable columns={cols} rows={rows} ariaLabel="Invoice report" />
}
