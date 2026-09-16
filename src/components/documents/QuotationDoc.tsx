import type { Customer, Quotation } from '../../lib/types'
import { computeTotals, lineAmount, quotationStatusOf } from '../../lib/compute'
import { fmtDate, money, num } from '../../lib/format'
import { DocSheet } from './DocSheet'

export function QuotationDoc({ quotation, customer }: { quotation: Quotation; customer: Customer | undefined }) {
  const t = computeTotals(quotation.items, quotation.discount, quotation.tax_rate)
  const status = quotationStatusOf(quotation)
  const stamp =
    status === 'Approved'
      ? { text: 'Approved', className: 'st-approved' }
      : status === 'Rejected'
        ? { text: 'Rejected', className: 'st-overdue' }
        : status === 'Draft'
          ? { text: 'Draft', className: 'st-draft' }
          : status === 'Expired'
            ? { text: 'Expired', className: 'st-draft' }
            : undefined

  return (
    <DocSheet
      title="Quotation"
      docNo={quotation.number}
      meta={[
        ['Date', fmtDate(quotation.date)],
        ['Valid Until', fmtDate(quotation.valid_until)],
        ['Status', status],
      ]}
      stamp={stamp}
      footerCells={[
        { k: 'Prepared for', v: customer?.company || customer?.name || '—' },
        { k: 'Document No.', v: quotation.number },
        { k: 'Date', v: fmtDate(quotation.date) },
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
          <div className="db-label">Project</div>
          <div className="db-name">{quotation.project_name || '—'}</div>
          <div className="db-lines">{quotation.description}</div>
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
          {quotation.items.map((it, i) => (
            <tr key={it.id}>
              <td className="num-cell">{i + 1}</td>
              <td className="desc-cell">{it.description || '—'}</td>
              <td className="num-cell">{num(it.quantity)}</td>
              <td className="num-cell">{it.unit}</td>
              <td className="num-cell">{money(it.unit_price)}</td>
              <td className="num-cell" style={{ fontWeight: 600 }}>{money(lineAmount(it))}</td>
            </tr>
          ))}
          {quotation.items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: '#8a929d', padding: '18px 0' }}>
                No items on this quotation.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="doc-summary">
        <div className="ds-notes">
          {quotation.notes && (
            <>
              <div className="db-label">Notes</div>
              <div className="note-text">{quotation.notes}</div>
            </>
          )}
          {quotation.terms && (
            <>
              <div className="db-label" style={{ marginTop: 12 }}>Terms &amp; Conditions</div>
              <div className="note-text">{quotation.terms}</div>
            </>
          )}
        </div>
        <div className="doc-totals">
          <div className="trow">
            <span>Subtotal</span>
            <span className="tv">{money(t.subtotal)}</span>
          </div>
          {quotation.discount > 0 && (
            <div className="trow">
              <span>Discount</span>
              <span className="tv">– {money(t.discount)}</span>
            </div>
          )}
          {quotation.tax_rate > 0 && (
            <div className="trow">
              <span>Tax ({num(quotation.tax_rate)}%)</span>
              <span className="tv">{money(t.tax)}</span>
            </div>
          )}
          <div className="trow grand">
            <span>Grand Total</span>
            <span className="tv">{money(t.total)}</span>
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
            <span className="sig-name">{customer?.contact_person || customer?.name || ''}</span>
          </div>
          <div className="sig-line" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span className="sig-role">Conforme — Customer</span>
          </div>
        </div>
      </div>
    </DocSheet>
  )
}
