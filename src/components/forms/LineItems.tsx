import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { LineItem } from '../../lib/types'
import { COMMON_UNITS } from '../../lib/types'
import { computeTotals, lineAmount, newLineItem } from '../../lib/compute'
import { money, num } from '../../lib/format'
import { Button } from '../ui'

export function LineItemsEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  disabled?: boolean
}) {
  const [unitCustom, setUnitCustom] = useState<Record<string, string>>({})

  const setItem = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const removeItem = (id: string) => onChange(items.filter((it) => it.id !== id))

  return (
    <div className="items-editor">
      <div className="ie-row ie-head">
        <span className="ie-no">#</span>
        <span>Description</span>
        <span>Qty</span>
        <span className="h-unit">Unit</span>
        <span>Unit Price</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span />
      </div>
      {items.map((it, i) => (
        <div className="ie-row" key={it.id}>
          <span className="ie-no">{i + 1}</span>
          <input
            className="input"
            value={it.description}
            placeholder="e.g. Exhaust hood, Type 304, 2.4m × 1.2m"
            onChange={(e) => setItem(it.id, { description: e.target.value })}
            disabled={disabled}
          />
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={it.quantity || ''}
            onChange={(e) => setItem(it.id, { quantity: Number(e.target.value) || 0 })}
            disabled={disabled}
          />
          <input
            className="input ie-unit"
            list={`units-${it.id}`}
            value={unitCustom[it.id] ?? it.unit}
            onChange={(e) => {
              setUnitCustom((u) => ({ ...u, [it.id]: e.target.value }))
              setItem(it.id, { unit: e.target.value })
            }}
            disabled={disabled}
          />
          <datalist id={`units-${it.id}`}>
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={it.unit_price || ''}
            onChange={(e) => setItem(it.id, { unit_price: Number(e.target.value) || 0 })}
            disabled={disabled}
          />
          <span className="ie-amount">{money(lineAmount(it))}</span>
          <button
            type="button"
            className="ie-remove"
            onClick={() => removeItem(it.id)}
            title="Remove line"
            disabled={disabled}
          >
            {disabled ? <X size={14} /> : <Trash2 size={14} />}
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: '18px 14px', color: 'var(--steel-400)', fontSize: 13 }}>
          No items yet — add the first line of the quotation.
        </div>
      )}
      <div className="ie-foot">
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => onChange([...items, newLineItem()])}
          disabled={disabled}
        >
          Add Item
        </Button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel-500)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}

export function TotalsPanel({
  items,
  discount,
  taxRate,
  onDiscount,
  onTaxRate,
  extraRows,
  grandLabel = 'Grand Total',
}: {
  items: LineItem[]
  discount: number
  taxRate: number
  onDiscount?: (v: number) => void
  onTaxRate?: (v: number) => void
  extraRows?: { label: string; value: string; strong?: boolean }[]
  grandLabel?: string
}) {
  const t = computeTotals(items, discount, taxRate)
  return (
    <div className="totals-box">
      <div className="totals-row">
        <span>Subtotal</span>
        <span className="t-val">{money(t.subtotal)}</span>
      </div>
      <div className="totals-row">
        <span>Discount</span>
        {onDiscount ? (
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={discount || ''}
            placeholder="0"
            onChange={(e) => onDiscount(Number(e.target.value) || 0)}
          />
        ) : (
          <span className="t-val">– {money(discount)}</span>
        )}
      </div>
      <div className="totals-row">
        <span>Tax %</span>
        {onTaxRate ? (
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={taxRate || ''}
            placeholder="0"
            onChange={(e) => onTaxRate(Number(e.target.value) || 0)}
          />
        ) : (
          <span className="t-val">{num(taxRate)}%</span>
        )}
      </div>
      <div className="totals-row">
        <span>Tax amount</span>
        <span className="t-val">{money(t.tax)}</span>
      </div>
      {extraRows?.map((r) => (
        <div key={r.label} className={`totals-row ${r.strong ? 'grand' : ''}`}>
          <span>{r.label}</span>
          <span className="t-val" style={r.strong ? { color: 'var(--red)' } : undefined}>
            {r.value}
          </span>
        </div>
      ))}
      <div className="totals-row grand">
        <span>{grandLabel}</span>
        <span className="t-val">{money(t.total)}</span>
      </div>
    </div>
  )
}
