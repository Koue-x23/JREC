import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Button, ConfirmDialog, EmptyState, LoadingPanel } from '../components/ui'
import { StatementDoc } from '../components/documents/StatementDoc'

export default function StatementView() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, deleteStatement } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const statement = data.statements.find((s) => s.id === id)
  const customer = data.customers.find((c) => c.id === statement?.customer_id)

  if (loading) return <LoadingPanel label="Loading statement…" />

  if (!statement) {
    return (
      <div className="page">
        <EmptyState
          title="Statement not found"
          hint="It may have been deleted."
          action={<Link to="/billing-statements" className="btn btn-secondary">Back to statements</Link>}
        />
      </div>
    )
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteStatement(statement.id)
      toast.success(`${statement.number} deleted.`)
      navigate('/billing-statements')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="doc-actions no-print">
        <span className="da-title">
          <Link to="/billing-statements" className="btn btn-ghost btn-sm" style={{ marginRight: 4 }}>
            <ArrowLeft size={14} />
          </Link>
          {statement.number}
        </span>
        <span style={{ flex: 1 }} />
        <Button variant="steel" icon={<Printer size={15} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      <StatementDoc statement={statement} customer={customer} />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={doDelete}
        title="Delete billing statement?"
        confirmLabel="Delete statement"
        busy={busy}
        message={
          <>
            Permanently delete <b>{statement.number}</b>? Invoices and payments are not affected.
          </>
        }
      />
    </div>
  )
}
