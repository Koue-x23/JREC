import type { Customer, Job, ServiceReport } from '../../lib/types'
import { fmtDate } from '../../lib/format'
import { DocSheet } from './DocSheet'

export function ServiceReportDoc({
  report,
  customer,
  job,
}: {
  report: ServiceReport
  customer: Customer | undefined
  job: Job | undefined
}) {
  return (
    <DocSheet
      title="Service Report"
      docNo={report.number}
      meta={[
        ['Service Date', fmtDate(report.service_date)],
        ['Technician', report.technician || '—'],
        ['Status', report.status],
      ]}
      stamp={
        report.status === 'Completed'
          ? { text: 'Completed', className: 'st-approved' }
          : report.status === 'In Progress'
            ? { text: 'In Progress', className: 'st-partial' }
            : { text: 'Pending', className: 'st-unpaid' }
      }
      footerCells={[
        { k: 'Customer', v: customer?.company || customer?.name || '—' },
        { k: 'Document No.', v: report.number },
        { k: 'Service Date', v: fmtDate(report.service_date) },
      ]}
    >
      <div className="doc-fieldgrid">
        <div className="doc-field">
          <div className="df-label">Customer</div>
          <div className="df-value">{customer ? `${customer.name}${customer.company ? ` — ${customer.company}` : ''}` : '—'}</div>
        </div>
        <div className="doc-field">
          <div className="df-label">Location</div>
          <div className="df-value">{report.location || '—'}</div>
        </div>
        <div className="doc-field">
          <div className="df-label">Job Number</div>
          <div className="df-value">{job ? `${job.number} — ${job.project_name}` : '— (standalone service)'}</div>
        </div>
        <div className="doc-field">
          <div className="df-label">Item / Product</div>
          <div className="df-value">{report.item_product || '—'}</div>
        </div>
      </div>

      <div className="doc-section">
        <div className="db-label">
          Problem / Request <span>{'REF. A'}</span>
        </div>
        <div className="note-text">{report.problem_request || '—'}</div>
      </div>

      <div className="doc-section">
        <div className="db-label">
          Work Performed <span>{'REF. B'}</span>
        </div>
        <div className="note-text">{report.work_performed || '—'}</div>
      </div>

      <div className="doc-section">
        <div className="db-label">
          Materials Used <span>{'REF. C'}</span>
        </div>
        <div className="note-text">{report.materials_used || '—'}</div>
      </div>

      <div className="doc-fieldgrid" style={{ marginTop: 16 }}>
        <div className="doc-field">
          <div className="df-label">Welder / Technician</div>
          <div className="df-value">{report.technician || '—'}</div>
        </div>
        <div className="doc-field">
          <div className="df-label">Status</div>
          <div className="df-value">{report.status}</div>
        </div>
      </div>

      <div className="doc-section">
        <div className="db-label">
          Remarks <span>{'REF. D'}</span>
        </div>
        <div className="note-text">{report.remarks || '—'}</div>
      </div>

      <div className="doc-signs" style={{ marginTop: 42 }}>
        <div className="doc-sign">
          <div className="sig-line">
            <span className="sig-name">{report.technician || ''}</span>
          </div>
          <div className="sig-line" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span className="sig-role">Welder / Technician — JREC</span>
          </div>
        </div>
        <div className="doc-sign">
          <div className="sig-line">
            <span className="sig-name">{report.acknowledged_by || ''}</span>
          </div>
          <div className="sig-line" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span className="sig-role">
              Customer Acknowledgment{report.acknowledged_at ? ` — ${fmtDate(report.acknowledged_at)}` : ''}
            </span>
          </div>
        </div>
      </div>
    </DocSheet>
  )
}
