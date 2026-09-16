import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Printer, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Button, ConfirmDialog, EmptyState, LoadingPanel } from '../components/ui'
import { ServiceReportDoc } from '../components/documents/ServiceReportDoc'

export default function ServiceReportView() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, deleteServiceReport } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const report = data.service_reports.find((s) => s.id === id)
  const customer = data.customers.find((c) => c.id === report?.customer_id)
  const job = data.jobs.find((j) => j.id === report?.job_id)

  if (loading) return <LoadingPanel label="Loading service report…" />

  if (!report) {
    return (
      <div className="page">
        <EmptyState
          title="Service report not found"
          hint="It may have been deleted."
          action={<Link to="/service-reports" className="btn btn-secondary">Back to service reports</Link>}
        />
      </div>
    )
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      await deleteServiceReport(report.id)
      toast.success(`${report.number} deleted.`)
      navigate('/service-reports')
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
          <Link to="/service-reports" className="btn btn-ghost btn-sm" style={{ marginRight: 4 }}>
            <ArrowLeft size={14} />
          </Link>
          {report.number}
        </span>
        <span style={{ flex: 1 }} />
        <Button icon={<Pencil size={15} />} onClick={() => navigate(`/service-reports/${report.id}/edit`)}>
          Edit
        </Button>
        <Button variant="steel" icon={<Printer size={15} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
          Delete
        </Button>
      </div>

      <ServiceReportDoc report={report} customer={customer} job={job} />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={doDelete}
        title="Delete service report?"
        confirmLabel="Delete report"
        busy={busy}
        message={
          <>
            Permanently delete <b>{report.number}</b>? This cannot be undone.
          </>
        }
      />
    </div>
  )
}
