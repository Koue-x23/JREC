import type { Customer, Invoice, Job, Payment } from '../../lib/types'
import { computeTotals, deriveInvoice, lineAmount } from '../../lib/compute'
import { fmtDate, money, num } from '../../lib/format'
import { DocSheet } from './DocSheet'

export function InvoiceDoc({
  invoice,
  customer,
  job,
  payments,
}: {
  invoice: Invoice
  customer: Customer | undefined
  job: Job | undefined
  payments: Payment[]
}) {
  const t = computeTotals(invoice.items, invoice.discount, invoice.tax_rate)
  const d = deriveInvoice(invoice, payments)
  const stamp =
    d.status === 'Paid'
      ? { text: 'Paid', className: 'st-paid' }
      : d.status === 'Overdue'
        ? { text: 'Overdue', className: 'st-overdue' }
        : d.status === 'Partially Paid'
          ? { text: 'Partially Paid', className: 'st-partial' }
          : { text: 'Unpaid', className: 'st-unpaid' }

  return (
    <DocSheet
      title="Invoice"
      docNo={invoice.number}
      meta={[
        ['Invoice Date', fmtDate(invoice.invoice_date)],
        ['Due Date', fmtDate(invoice.due_date)],
        ['Status', d.status],
      ]}
      stamp={stamp}
      footerCells={[
        { k: 'Bill To', v: customer?.company || customer?.name || '—' },
        { k: 'Document No.', v: invoice.number },
        { k: 'Due Date', v: fmtDate(invoice.due_date) },
      ]}
    >
      <div className="doc-blocks">
        <div className="doc-block">
          <div className="db-label">Bill To</div>
          <div className="db-name">{customer?.name || '—'}</div>
          <div className="db-lines">
            {customer?.company}
            {customer?.company && customer?.address ? '\n' : ''}
            {customer?.address}
            {customer?.phone ? `\nTel ${customer.phone}` : ''}
            {customer?.email ? `\n${customer.email}` : ''}
          </div>
        </div>
        <div className="doc-block">
          <div className="db-label">For / Project</div>
          <div className="db-name">{invoice.project_name || '—'}</div>
          <div className="db-lines">
            {job ? `Job reference: ${job.number} — ${job.project_name}` : 'Professional services & fabricated items'}
          </div>
        </div>
      </div>

      <table className="doc-table">
        <thead>
          <tr>
            <th style={{ width: 26 }}>No.</th>
            <th>Description</th>
            <th className="num-cell" style={{ width: 56 }}>Qty</th>
            <th className="num-cell" style={{ width: 50 }}>Unit</th>
            <th className="num-cell" style={{ width: 88 }}>Unit Price</th>
            <th className="num-cell" style={{ width: 100 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={it.id}>
              <td className="num-cell">{i + 1}</td>
              <td className="desc-cell">{it.description || '—'}</td>
              <td className="num-cell">{num(it.quantity)}</td>
              <td className="num-cell">{it.unit}</td>
              <td className="num-cell">{money(it.unit_price)}</td>
              <td className="num-cell" style={{ fontWeight: 600 }}>{money(lineAmount(it))}</td>
            </tr>
          ))}
          {invoice.items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: '#8a929d', padding: '18px 0' }}>
                No items on this invoice.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="doc-summary">
        <div className="ds-notes">
          {invoice.notes && (
            <>
              <div className="db-label">Notes</div>
              <div className="note-text">{invoice.notes}</div>
            </>
          )}
          {payments.length > 0 && (
            <>
              <div className="db-label" style={{ marginTop: 12 }}>Payments Applied</div>
              <div className="note-text">
                {payments.map((p) => `${fmtDate(p.date)} · ${p.number} · ${p.method} — ${money(p.amount)}`).join('\n')}
              </div>
            </>
          )}
        </div>
        <div className="doc-totals">
          <div className="trow">
            <span>Subtotal</span>
            <span className="tv">{money(t.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="trow">
              <span>Discount</span>
              <span className="tv">– {money(t.discount)}</span>
            </div>
          )}
          {invoice.tax_rate > 0 && (
            <div className="trow">
              <span>Tax ({num(invoice.tax_rate)}%)</span>
              <span className="tv">{money(t.tax)}</span>
            </div>
          )}
          <div className="trow grand">
            <span>Total</span>
            <span className="tv">{money(t.total)}</span>
          </div>
          <div className="trow">
            <span>Amount Paid</span>
            <span className="tv">{money(d.paid)}</span>
          </div>
          <div className={`trow ${d.balance > 0 ? 'balance-warn' : ''}`} style={{ fontWeight: 700 }}>
            <span>Balance Due</span>
            <span className="tv" style={{ color: d.balance > 0 ? 'var(--red)' : undefined }}>
              {money(d.balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="doc-signs">
        <div className="doc-sign">
          <div className="sig-line">
            <span className="sig-name">&nbsp;</span>
          </div>
          <div className="sig-line" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span className="sig-role">Prepared by — JREC</span>
          </div>
        </div>
        <div className="doc-sign">
          <div className="sig-line">
            <span className="sig-name">&nbsp;</span>
          </div>
          <div className="sig-line" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span className="sig-role">Received by — Customer</span>
          </div>
        </div>
      </div>
    </DocSheet>
  )
}
