import type { BillingStatement, Customer } from '../../lib/types'
import { fmtDate, money } from '../../lib/format'
import { DocSheet } from './DocSheet'

export function StatementDoc({
  statement,
  customer,
}: {
  statement: BillingStatement
  customer: Customer | undefined
}) {
  const rows: { date: string; ref: string; desc: string; debit: number; credit: number }[] =
    statement.entries.map((e) => ({
      date: e.date,
      ref: e.ref,
      desc: e.kind === 'Previous Balance' ? e.description : `${e.kind === 'Adjustment' ? '' : e.kind === 'Payment' ? '' : ''}${e.description}`,
      debit: e.amount > 0 ? e.amount : 0,
      credit: e.amount < 0 ? -e.amount : 0,
    }))

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

  return (
    <DocSheet
      title="Statement of Account"
      docNo={statement.number}
      meta={[
        ['Statement Date', fmtDate(statement.date)],
        ['Period', `${fmtDate(statement.period_start)} – ${fmtDate(statement.period_end)}`],
      ]}
      footerCells={[
        { k: 'Customer', v: customer?.company || customer?.name || '—' },
        { k: 'Document No.', v: statement.number },
        { k: 'Period End', v: fmtDate(statement.period_end) },
      ]}
    >
      <div className="doc-blocks">
        <div className="doc-block">
          <div className="db-label">Customer</div>
          <div className="db-name">{customer?.name || '—'}</div>
          <div className="db-lines">
            {customer?.company}
            {customer?.company && customer?.address ? '\n' : ''}
            {customer?.address}
            {customer?.phone ? `\nTel ${customer.phone}` : ''}
          </div>
        </div>
        <div className="doc-block">
          <div className="db-label">Statement Period</div>
          <div className="db-name">
            {fmtDate(statement.period_start)} — {fmtDate(statement.period_end)}
          </div>
          <div className="db-lines">This statement summarizes invoices, payments and adjustments for the period above.</div>
        </div>
      </div>

      <table className="doc-table">
        <thead>
          <tr>
            <th style={{ width: 76 }}>Date</th>
            <th style={{ width: 88 }}>Reference</th>
            <th>Description</th>
            <th className="num-cell" style={{ width: 100 }}>Debit</th>
            <th className="num-cell" style={{ width: 100 }}>Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="num-cell">{fmtDate(r.date)}</td>
              <td className="num-cell">{r.ref}</td>
              <td className="desc-cell">{r.desc}</td>
              <td className="num-cell">{r.debit ? money(r.debit) : '—'}</td>
              <td className={`num-cell ${r.credit ? 'credit' : ''}`}>{r.credit ? money(r.credit) : '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#8a929d', padding: '18px 0' }}>
                No transactions within this period.
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={3} style={{ fontWeight: 700, borderTop: '1.5px solid #191d23' }}>Totals</td>
            <td className="num-cell" style={{ fontWeight: 700, borderTop: '1.5px solid #191d23' }}>{money(totalDebit)}</td>
            <td className="num-cell" style={{ fontWeight: 700, borderTop: '1.5px solid #191d23' }}>{money(totalCredit)}</td>
          </tr>
        </tbody>
      </table>

      <div className="doc-summary">
        <div className="ds-notes">
          {statement.notes && (
            <>
              <div className="db-label">Notes</div>
              <div className="note-text">{statement.notes}</div>
            </>
          )}
        </div>
        <div className="doc-totals">
          <div className="trow">
            <span>Previous Balance</span>
            <span className="tv">{money(statement.previous_balance)}</span>
          </div>
          <div className="trow">
            <span>Adjustments</span>
            <span className="tv">{money(statement.adjustments)}</span>
          </div>
          <div className="trow grand">
            <span>Current Balance</span>
            <span className="tv">{money(statement.current_balance)}</span>
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
