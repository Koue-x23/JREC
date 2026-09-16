import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  HardHat,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { money, moneyShort, fmtDate } from '../lib/format'
import {
  countByStatus,
  dashboardStats,
  monthlySeries,
  receivablesAging,
  recentActivity,
} from '../lib/selectors'
import { quotationStatusOf } from '../lib/compute'
import { StatCard, SectionHead, PageHeader, StatusBadge } from '../components/ui'
import { BarChart, DonutChart, HBarChart } from '../components/charts'
import { STATUS_COLOR } from '../components/ui'

export default function Dashboard() {
  const { data, loading, error } = useData()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="page">
        <PageHeader kicker="Module 01 · Control" title="Dashboard" />
        <div className="card">
          <div className="loading-panel">
            <div className="spinner" />
            <span>Loading business overview…</span>
          </div>
        </div>
      </div>
    )
  }

  const stats = dashboardStats(data)
  const months = monthlySeries(data, 12)
  const aging = receivablesAging(data)
  const jobsByStatus = countByStatus(data.jobs)
  const quoStatuses = new Map(data.quotations.map((q) => [q.id, quotationStatusOf(q)]))
  const quoByStatus = countByStatus(
    data.quotations.map((q) => ({ status: quoStatuses.get(q.id) ?? q.status })),
  )

  const quickActions = [
    { label: 'New Customer', sub: 'CUST', to: '/customers?new=1', icon: <Users size={16} /> },
    { label: 'New Quotation', sub: 'QUO', to: '/quotations/new', icon: <FileText size={16} /> },
    { label: 'New Job', sub: 'JOB', to: '/jobs?new=1', icon: <HardHat size={16} /> },
    { label: 'New Service Report', sub: 'SR', to: '/service-reports/new', icon: <ClipboardList size={16} /> },
    { label: 'New Invoice', sub: 'INV', to: '/invoices/new', icon: <Receipt size={16} /> },
    { label: 'Record Payment', sub: 'PAY', to: '/payments?new=1', icon: <CreditCard size={16} /> },
  ]

  const recentKinds = [
    { kind: 'quotation' as const, title: 'Recent Quotations' },
    { kind: 'job' as const, title: 'Recent Jobs' },
    { kind: 'service' as const, title: 'Recent Service Reports' },
    { kind: 'invoice' as const, title: 'Recent Invoices' },
    { kind: 'payment' as const, title: 'Recent Payments' },
  ]

  return (
    <div className="page">
      {error && <div className="error-panel">{error}</div>}
      <PageHeader
        kicker="Module 01 · Control"
        title="Dashboard"
        sub={`${data.settings.business_name} — live business overview`}
      />

      {/* KPI grid */}
      <div className="stat-grid">
        <StatCard
          label="Total Customers"
          value={stats.totalCustomers}
          sub="On file"
          tone="info"
          icon={<Users size={16} />}
        />
        <StatCard
          label="Active Jobs"
          value={stats.activeJobs}
          sub={stats.jobsOnHold ? `${stats.jobsOnHold} on hold` : 'In production'}
          tone="red"
          icon={<HardHat size={16} />}
        />
        <StatCard
          label="Pending Quotations"
          value={stats.pendingQuotations}
          sub="Awaiting decision"
          tone="warn"
          icon={<FileText size={16} />}
        />
        <StatCard
          label="Approved Quotations"
          value={stats.approvedQuotations}
          sub="Won & billable"
          tone="ok"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Unpaid Invoices"
          value={moneyShort(stats.unpaidInvoicesAmount)}
          sub={`${stats.unpaidInvoicesCount} invoice(s) not yet due`}
          money
          tone="warn"
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="Overdue Invoices"
          value={moneyShort(stats.overdueInvoicesAmount)}
          sub={`${stats.overdueInvoicesCount} past due date`}
          money
          tone="red"
          icon={<AlertTriangle size={16} />}
        />
        <StatCard
          label="Total Payments"
          value={moneyShort(stats.totalPayments)}
          sub={`${moneyShort(stats.paymentsThisMonth)} this month`}
          money
          tone="ok"
          icon={<Wallet size={16} />}
        />
        <StatCard
          label="Outstanding Balance"
          value={moneyShort(stats.outstandingBalance)}
          sub="Total receivables"
          money
          tone="info"
          icon={<CreditCard size={16} />}
        />
      </div>

      {/* Quick actions */}
      <SectionHead title="Quick Actions" code="Fast create" />
      <div className="quick-grid">
        {quickActions.map((a) => (
          <button className="quick-tile" key={a.to} onClick={() => navigate(a.to)}>
            <span className="qt-icon">{a.icon}</span>
            <span className="qt-label">{a.label}</span>
            <span className="qt-sub">+ {a.sub}</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <SectionHead title="Business Overview" code="Rolling 12 months" />
      <div className="dash-grid">
        <div className="chart-card">
          <div className="chart-title">
            <span className="sec-mark" /> Monthly Sales &amp; Payments
          </div>
          <div className="chart-sub">Invoiced vs collected, per month</div>
          <BarChart
            data={months.map((m) => ({ label: m.label, a: m.sales, b: m.payments }))}
            aName="Sales (invoiced)"
            bName="Payments (collected)"
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            <span className="sec-mark" /> Outstanding Receivables
          </div>
          <div className="chart-sub">By aging bucket</div>
          <HBarChart
            data={aging.map((b) => ({
              label: `${b.label} (${b.count})`,
              value: b.amount,
              color: b.label === 'Current' ? '#6b7480' : b.label === '1–30 days' ? '#b06e00' : b.label === '31–60 days' ? '#c14a00' : '#d92b2b',
            }))}
            formatValue={(v) => moneyShort(v)}
          />
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--steel-500)' }}>
            Total outstanding:{' '}
            <b className="mono" style={{ color: 'var(--ink)' }}>
              {money(stats.outstandingBalance)}
            </b>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">
            <span className="sec-mark" /> Jobs by Status
          </div>
          <div className="chart-sub">All projects on file</div>
          <DonutChart
            data={jobsByStatus.map((s) => ({ ...s, color: STATUS_COLOR[s.label] ?? '#8a929d' }))}
            centerLabel="Jobs"
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            <span className="sec-mark" /> Quotations by Status
          </div>
          <div className="chart-sub">Pipeline health</div>
          <HBarChart
            data={quoByStatus.map((s) => ({
              label: s.label,
              value: s.value,
              color: STATUS_COLOR[s.label] ?? '#8a929d',
            }))}
            formatValue={(v) => String(v)}
          />
        </div>
      </div>

      {/* Recent activity */}
      <SectionHead title="Recent Activity" code="Latest records" />
      <div className="dash-recent">
        {recentKinds.map(({ kind, title }) => (
          <div className="card" key={kind}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--steel-100)',
              }}
            >
              <span style={{ font: "700 13.5px var(--font-head)", textTransform: 'uppercase', letterSpacing: '.1em' }}>
                {title}
              </span>
              <Link
                to={
                  kind === 'quotation' ? '/quotations' : kind === 'job' ? '/jobs' : kind === 'service'
                    ? '/service-reports' : kind === 'invoice' ? '/invoices' : '/payments'
                }
                style={{ fontSize: 12.5, color: 'var(--red)', fontWeight: 600 }}
              >
                View all →
              </Link>
            </div>
            <div className="recent-list">
              {recentActivity(data, kind, 5).map((r) => (
                <div key={r.id} className="recent-row" onClick={() => navigate(r.to)}>
                  <span className="rr-num">{r.number}</span>
                  <span className="rr-main">
                    <span className="rr-title">{r.title || '—'}</span>
                    <span className="rr-sub">{r.who}</span>
                  </span>
                  <span className="rr-end">
                    {r.amount !== undefined && (
                      <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        {money(r.amount)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 }}>
                      {r.status && r.kind !== 'payment' ? <StatusBadge status={r.status} /> : null}
                      <span className="mono muted small">{fmtDate(r.date)}</span>
                    </div>
                  </span>
                </div>
              ))}
              {recentActivity(data, kind, 5).length === 0 && (
                <div style={{ padding: '22px 18px', color: 'var(--steel-400)', fontSize: 13 }}>
                  No records yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link to="/reports" className="btn btn-secondary btn-sm">
          <BookOpen size={14} /> Open reporting center
        </Link>
      </div>
    </div>
  )
}
