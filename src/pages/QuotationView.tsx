import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Copy,
  HardHat,
  Pencil,
  Printer,
  Trash2,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { quotationStatusOf } from '../lib/compute'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingPanel,
  StatusBadge,
} from '../components/ui'
import { QuotationDoc } from '../components/documents/QuotationDoc'

export default function QuotationView() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, setQuotationStatus, duplicateQuotation, deleteQuotation, createJob } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const quotation = data.quotations.find((q) => q.id === id)
  const customer = data.customers.find((c) => c.id === quotation?.customer_id)
  const linkedJob = data.jobs.find((j) => j.quotation_id === quotation?.id)

  if (loading) return <LoadingPanel label="Loading quotation…" />

  if (!quotation) {
    return (
      <div className="page">
        <EmptyState
          icon={<Trash2 size={22} />}
          title="Quotation not found"
          hint="It may have been deleted."
          action={<Link to="/quotations" className="btn btn-secondary">Back to quotations</Link>}
        />
      </div>
    )
  }

  const status = quotationStatusOf(quotation)

  const createJobFromQuotation = async () => {
    if (!quotation || !customer) return
    setBusy(true)
    try {
      const job = await createJob({
        customer_id: customer.id,
        quotation_id: quotation.id,
        project_name: quotation.project_name,
        description:
          quotation.description +
          (quotation.items.length
            ? `\n\nScope per ${quotation.number}:\n` +
              quotation.items.map((i) => `• ${i.description} — ${i.quantity} ${i.unit}`).join('\n')
            : ''),
        start_date: new Date().toISOString().slice(0, 10),
        expected_completion: '',
        actual_completion: '',
        fabricator: '',
        status: 'Pending',
        notes: `Created from quotation ${quotation.number}.`,
      })
      toast.success(`Job ${job.number} created from ${quotation.number}.`)
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create job.')
    } finally {
      setBusy(false)
    }
  }

  const mark = async (s: 'Approved' | 'Rejected') => {
    setBusy(true)
    try {
      await setQuotationStatus(quotation.id, s)
      toast.success(`${quotation.number} marked as ${s}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status.')
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteQuotation(quotation.id)
      toast.success(`${quotation.number} deleted.`)
      navigate('/quotations')
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
          <Link to="/quotations" className="btn btn-ghost btn-sm" style={{ marginRight: 4 }}>
            <ArrowLeft size={14} />
          </Link>
          {quotation.number}
          <StatusBadge status={status} />
        </span>
        {status === 'Approved' && !linkedJob && (
          <Button variant="primary" icon={<HardHat size={15} />} onClick={createJobFromQuotation} disabled={busy}>
            Create Job from Quotation
          </Button>
        )}
        {status === 'Approved' && linkedJob && (
          <Link to={`/jobs/${linkedJob.id}`} className="btn btn-secondary btn-sm">
            <HardHat size={14} /> Job {linkedJob.number}
          </Link>
        )}
        {(status === 'Sent' || status === 'Pending') && (
          <>
            <Button icon={<Check size={15} />} onClick={() => mark('Approved')} disabled={busy}>
              Mark Approved
            </Button>
            <Button icon={<X size={15} />} onClick={() => mark('Rejected')} disabled={busy}>
              Mark Rejected
            </Button>
          </>
        )}
        <span style={{ flex: 1 }} />
        <Button
          icon={<Copy size={15} />}
          onClick={async () => {
            try {
              const copy = await duplicateQuotation(quotation.id)
              toast.success(`Duplicated as ${copy.number}.`)
              navigate(`/quotations/${copy.id}/edit`)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Could not duplicate.')
            }
          }}
        >
          Duplicate
        </Button>
        <Button icon={<Pencil size={15} />} onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
          Edit
        </Button>
        <Button variant="steel" icon={<Printer size={15} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      <QuotationDoc quotation={quotation} customer={customer} />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={doDelete}
        title="Delete quotation?"
        confirmLabel="Delete quotation"
        busy={busy}
        message={
          linkedJob ? (
            <>
              This quotation is linked to job <b>{linkedJob.number}</b>. Delete that job first.
            </>
          ) : (
            <>
              Permanently delete <b>{quotation.number}</b>? This cannot be undone.
            </>
          )
        }
      />
    </div>
  )
}
