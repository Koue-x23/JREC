import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  HardHat,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { GlobalSearch } from './GlobalSearch'
import { dashboardStats } from '../lib/selectors'
import { fmtDate } from '../lib/format'
import { BrandBlock } from './LogoMark'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  badge?: number
  badgeAlert?: boolean
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data, store } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const stats = dashboardStats(data)

  const ops: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { to: '/customers', label: 'Customers', icon: <Users size={17} />, badge: stats.totalCustomers },
    { to: '/quotations', label: 'Quotations', icon: <FileText size={17} />, badge: stats.pendingQuotations },
    { to: '/jobs', label: 'Jobs / Projects', icon: <HardHat size={17} />, badge: stats.activeJobs },
    { to: '/service-reports', label: 'Service Reports', icon: <ClipboardList size={17} /> },
  ]
  const records: NavItem[] = [
    { to: '/invoices', label: 'Invoices', icon: <Receipt size={17} />, badge: stats.overdueInvoicesCount, badgeAlert: true },
    { to: '/payments', label: 'Payments', icon: <CreditCard size={17} /> },
    { to: '/billing-statements', label: 'Billing Statements', icon: <BookOpen size={17} /> },
  ]
  const analysis: NavItem[] = [
    { to: '/reports', label: 'Reports', icon: <BarChart3 size={17} /> },
    { to: '/settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
  ]

  const today = new Date()

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <BrandBlock />
          <button
            className="icon-btn"
            style={{ marginLeft: 'auto', color: '#8a929d' }}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group-label">Operations</div>
          {ops.map((n) => (
            <NavItem key={n.to} item={n} />
          ))}
          <div className="nav-group-label">Records &amp; Billing</div>
          {records.map((n) => (
            <NavItem key={n.to} item={n} />
          ))}
          <div className="nav-group-label">Analysis</div>
          {analysis.map((n) => (
            <NavItem key={n.to} item={n} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={`storage-pill ${store.kind === 'supabase' ? 'cloud' : ''}`}>
            <span className="dot" />
            {store.kind === 'supabase' ? 'Cloud DB · Supabase' : 'Local storage device'}
          </span>
          <div className="sf-biz">
            <b>{data.settings.business_name}</b>
            {data.settings.address}
            <br />
            {data.settings.phone}
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}
      <div className="app-main">
        <header className="topbar no-print">
          <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <GlobalSearch />
          <div className="topbar-date">
            <span className="tb-day">
              {today.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="tb-sub">
              {fmtDate(today.toISOString().slice(0, 10))} · JREC Manager
            </span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

function NavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className={`nav-badge ${item.badgeAlert ? 'alert' : ''}`}>{item.badge}</span>
      )}
    </NavLink>
  )
}
