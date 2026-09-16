import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Customer } from '../lib/types'
import { fmtDate } from '../lib/format'
import { customerBlockers, customerStats } from '../lib/selectors'
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingPanel,
  PageHeader,
  Pager,
  usePaged,
  type Column,
} from '../components/ui'
import { CustomerForm, type CustomerFormValues } from '../components/forms/CustomerForm'

export default function Customers() {
  const { data, loading, createCustomer, updateCustomer, deleteCustomer } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'owing'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (params.get('new')) {
      setEditing(null)
      setFormOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const rows = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return data.customers
      .map((c) => {
        const stats = customerStats(data, c.id)
        return {
          ...c,
          stats,
          search: `${c.name} ${c.company} ${c.phone} ${c.email} ${c.contact_person} ${c.code} ${c.address}`.toLowerCase(),
        }
      })
      .filter((c) => (!needle || c.search.includes(needle)))
      .filter((c) =>
        filter === 'all' ? true : filter === 'owing' ? c.stats.outstanding > 0.005 : c.stats.lastActivity !== '',
      )
      .sort((a, b) => b.date_added.localeCompare(a.date_added))
  }, [data, q, filter])

  const paged = usePaged(rows, 10)

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: 'code',
      header: 'ID',
      label: 'ID',
      render: (c) => <span className="col-num">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Customer',
      label: 'Customer',
      render: (c) => (
        <div>
          <div className="col-strong">{c.name}</div>
          {c.company && <div className="muted small">{c.company}</div>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      label: 'Contact',
      hideOnMobile: true,
      render: (c) => (
        <div className="small">
          <div>{c.phone || '—'}</div>
          {c.email && <div className="muted">{c.email}</div>}
        </div>
      ),
    },
    {
      key: 'records',
      header: 'Records',
      label: 'Records',
      hideOnMobile: true,
      render: (c) => (
        <span className="muted small nowrap">
          {c.stats.quotationCount}Q · {c.stats.jobCount}J · {c.stats.invoiceCount}I
        </span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      label: 'Outstanding',
      render: (c) =>
        c.stats.outstanding > 0.005 ? (
          <span className="col-money" style={{ color: 'var(--red)', fontWeight: 600 }}>
            ₱{c.stats.outstanding.toLocaleString()}
          </span>
        ) : (
          <span className="col-money muted">₱0</span>
        ),
    },
    {
      key: 'added',
      header: 'Added',
      label: 'Added',
      hideOnMobile: true,
      render: (c) => <span className="muted small nowrap">{fmtDate(c.date_added)}</span>,
    },
    {
      key: 'actions',
      header: '',
      label: 'Actions',
      render: (c) => (
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(c)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ]

  const openEdit = (c: Customer) => {
    setEditing(c)
    setFormOpen(true)
  }

  const submitForm = async (values: CustomerFormValues) => {
    try {
      if (editing) {
        await updateCustomer(editing.id, values)
        toast.success(`Customer ${values.name || values.company} updated.`)
      } else {
        const created = await createCustomer(values)
        toast.success(`Customer saved as ${created.code}.`)
      }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save customer.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteCustomer(deleting.id)
      toast.success(`Customer ${deleting.name} deleted.`)
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete customer.')
    } finally {
      setBusy(false)
    }
  }

  const blockers = deleting ? customerBlockers(data, deleting.id) : []

  return (
    <div className="page">
      <PageHeader
        kicker="Module 02 · Registry"
        title="Customers"
        sub={`${data.customers.length} customer record(s) on file`}
      >
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          New Customer
        </Button>
      </PageHeader>

      <div className="toolbar">
        <div className="filter-field" style={{ flex: 1, maxWidth: 340 }}>
          <Users size={14} />
          <input
            placeholder="Search name, company, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All customers</option>
            <option value="active">With activity</option>
            <option value="owing">With outstanding balance</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={paged.paged}
            onRowClick={(c) => navigate(`/customers/${c.id}`)}
            ariaLabel="Customers"
            empty={
              <EmptyState
                icon={<UserRound size={22} />}
                title="No customers found"
                hint={
                  q || filter !== 'all'
                    ? 'Try a different search or filter.'
                    : 'Add your first customer to start issuing quotations and invoices.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>
                    New Customer
                  </Button>
                }
              />
            }
          />
          <Pager
            page={paged.page}
            pageCount={paged.pageCount}
            onPage={paged.setPage}
            total={paged.total}
            unit="customers"
          />
        </>
      )}

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
        initial={editing}
        title={editing ? 'Edit Customer' : 'New Customer'}
        subtitle={editing ? `${editing.code} — update details` : 'Register a customer for the record book'}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete customer?"
        confirmLabel="Delete customer"
        busy={busy}
        message={
          deleting && blockers.length > 0 ? (
            <>
              <b>{deleting.name || deleting.company}</b> is linked to {blockers.join(', ')}.
              <br />
              <br />
              Delete those records first (or keep the customer for history). This protects your
              transaction records.
            </>
          ) : (
            <>
              Permanently delete <b>{deleting?.name || deleting?.company}</b>? This cannot be
              undone.
            </>
          )
        }
      />
    </div>
  )
}
