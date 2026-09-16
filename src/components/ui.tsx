import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'steel' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${
        size === 'lg' ? 'btn-lg' : ''
      } ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <span className="mh-mark" />
          <h3>
            {title}
            {subtitle && <span className="modal-sub">{subtitle}</span>}
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ── Confirm dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  busy = false,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ color: 'var(--steel-700)', fontSize: 13.5, lineHeight: 1.6 }}>{message}</div>
    </Modal>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────

const BADGE_VARIANT: Record<string, string> = {
  Draft: 'neutral',
  Sent: 'info',
  Pending: 'warn',
  Approved: 'ok',
  Rejected: 'danger',
  Expired: 'dark',
  'In Progress': 'info',
  'On Hold': 'dark',
  Completed: 'ok',
  Cancelled: 'danger',
  Unpaid: 'warn',
  'Partially Paid': 'info',
  Paid: 'ok',
  Overdue: 'danger',
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${BADGE_VARIANT[status] ?? 'neutral'}`}>{status}</span>
}

export const STATUS_COLOR: Record<string, string> = {
  Draft: '#8a929d',
  Sent: '#1f61c2',
  Pending: '#b06e00',
  Approved: '#178a4e',
  Rejected: '#d92b2b',
  Expired: '#565f6b',
  'In Progress': '#1f61c2',
  'On Hold': '#565f6b',
  Completed: '#178a4e',
  Cancelled: '#d92b2b',
  Unpaid: '#b06e00',
  'Partially Paid': '#1f61c2',
  Paid: '#178a4e',
  Overdue: '#d92b2b',
}

// ── Form field ───────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, required, hint, error, children, className = '' }: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

// ── Data table ───────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: ReactNode
  label: string // short label for mobile cards
  render: (row: T) => ReactNode
  cellClass?: string
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  empty?: ReactNode
  ariaLabel?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty,
  ariaLabel,
}: DataTableProps<T>) {
  const showEmpty = rows.length === 0 && empty
  return (
    <div className="table-wrap">
      <table className="data-table responsive" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.cellClass?.includes('col-money') ? 'right' : ''}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? 'clickable' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label}
                  className={`${c.cellClass ?? ''} ${c.hideOnMobile ? 'hide-m' : ''}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {showEmpty}
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────

export function usePaged<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safe = Math.min(page, pageCount)
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  return {
    page: safe,
    setPage,
    pageCount,
    total: rows.length,
    paged: rows.slice((safe - 1) * pageSize, safe * pageSize),
  }
}

export function Pager({
  page,
  pageCount,
  onPage,
  total,
  unit = 'records',
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
  total: number
  unit?: string
}) {
  if (total === 0) return null
  const from = (page - 1) * 10 + 1
  const to = Math.min(total, page * 10)
  const pages: number[] = []
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  for (let i = start; i < start + 5 && i <= pageCount; i++) pages.push(i)
  return (
    <div className="pager">
      <span className="pager-info">
        {total} {unit} · showing {from}–{to}
      </span>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={15} />
      </button>
      {pages.map((p) => (
        <button key={p} className={p === page ? 'on' : ''} onClick={() => onPage(p)}>
          {p}
        </button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <ChevronRight size={15} />
      </button>
    </div>
  )
}

// ── Empty / loading / error states ───────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

export function LoadingPanel({ label = 'Loading records…' }: { label?: string }) {
  return (
    <div className="loading-panel">
      <div className="spinner" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  )
}

export function ErrorPanel({ message }: { message: string }) {
  return <div className="error-panel">{message}</div>
}

// ── Page header & section heads ──────────────────────────────────────────────

export function PageHeader({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string
  title: ReactNode
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function SectionHead({
  title,
  code,
  action,
}: {
  title: string
  code?: string
  action?: ReactNode
}) {
  return (
    <div className="sec-head">
      <span className="sec-mark" />
      <h2>{title}</h2>
      {code && <span className="sec-code">{code}</span>}
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  money,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'red' | 'ok' | 'warn' | 'info'
  money?: boolean
}) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${money ? 'money' : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {icon && <div className="stat-icon">{icon}</div>}
    </div>
  )
}
