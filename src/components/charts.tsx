import { moneyShort, num } from '../lib/format'

// ── Grouped bar chart (monthly sales vs payments etc.) ──────────────────────

export interface BarDatum {
  label: string
  a: number
  b?: number
}

export function BarChart({
  data,
  aName,
  bName,
  aColor = '#d92b2b',
  bColor = '#3d444e',
  height = 210,
  money = true,
}: {
  data: BarDatum[]
  aName: string
  bName?: string
  aColor?: string
  bColor?: string
  height?: number
  money?: boolean
}) {
  const W = 620
  const H = height
  const padL = 46
  const padB = 24
  const padT = 10
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b ?? 0)))
  const niceMax = niceCeil(max)
  const plotW = W - padL - 8
  const plotH = H - padB - padT
  const n = data.length
  const slot = plotW / Math.max(1, n)
  const barW = bName ? Math.min(16, slot * 0.32) : Math.min(24, slot * 0.55)
  const fmt = (v: number) => (money ? moneyShort(v) : num(v))
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div>
      {(aName || bName) && (
        <div className="chart-legend">
          <span className="leg">
            <i style={{ background: aColor }} /> {aName}
          </span>
          {bName && (
            <span className="leg">
              <i style={{ background: bColor }} /> {bName}
            </span>
          )}
        </div>
      )}
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aName} chart`}>
        {ticks.map((t) => {
          const y = padT + plotH * (1 - t)
          return (
            <g key={t}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#e2e6ea" strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={padL - 7} y={y + 3.5} fontSize={9.5} fill="#8a929d" textAnchor="end">
                {fmt(niceMax * t)}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2
          const ha = (d.a / niceMax) * plotH
          const hb = ((d.b ?? 0) / niceMax) * plotH
          return (
            <g key={d.label + i}>
              {bName ? (
                <>
                  <rect
                    x={cx - barW - 2}
                    y={padT + plotH - ha}
                    width={barW}
                    height={Math.max(0, ha)}
                    fill={aColor}
                    rx={2}
                  >
                    <title>{`${d.label} — ${aName}: ${fmt(d.a)}`}</title>
                  </rect>
                  <rect
                    x={cx + 2}
                    y={padT + plotH - hb}
                    width={barW}
                    height={Math.max(0, hb)}
                    fill={bColor}
                    rx={2}
                  >
                    <title>{`${d.label} — ${bName}: ${fmt(d.b ?? 0)}`}</title>
                  </rect>
                </>
              ) : (
                <rect
                  x={cx - barW / 2}
                  y={padT + plotH - ha}
                  width={barW}
                  height={Math.max(0, ha)}
                  fill={aColor}
                  rx={2}
                >
                  <title>{`${d.label} — ${aName}: ${fmt(d.a)}`}</title>
                </rect>
              )}
              <text x={cx} y={H - 8} fontSize={9.5} fill="#6b7480" textAnchor="middle">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────────

export interface DonutDatum {
  label: string
  value: number
  color: string
}

export function DonutChart({
  data,
  centerLabel,
  formatValue = (v: number) => num(v),
}: {
  data: DonutDatum[]
  centerLabel?: string
  formatValue?: (v: number) => string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 52
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="donut chart">
        <circle cx="66" cy="66" r={R} fill="none" stroke="#eef1f4" strokeWidth="16" />
        {total > 0 &&
          data.map((d) => {
            const frac = d.value / total
            const el = (
              <circle
                key={d.label}
                cx="66"
                cy="66"
                r={R}
                fill="none"
                stroke={d.color}
                strokeWidth="16"
                strokeDasharray={`${frac * C} ${C - frac * C}`}
                strokeDashoffset={-offset * C}
                transform="rotate(-90 66 66)"
              >
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </circle>
            )
            offset += frac
            return el
          })}
        <text x="66" y="62" textAnchor="middle" fontSize="22" fontWeight="700" fill="#16191d">
          {formatValue(total)}
        </text>
        {centerLabel && (
          <text x="66" y="78" textAnchor="middle" fontSize="8.5" fill="#8a929d" letterSpacing="1">
            {centerLabel.toUpperCase()}
          </text>
        )}
      </svg>
      <div className="donut-legend grow">
        {data.map((d) => (
          <div className="dl-row" key={d.label}>
            <i style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="dl-val">{formatValue(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal bars ──────────────────────────────────────────────────────────

export interface HBarDatum {
  label: string
  value: number
  color?: string
}

export function HBarChart({
  data,
  formatValue = (v: number) => num(v),
}: {
  data: HBarDatum[]
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      {data.map((d) => (
        <div className="hbar-row" key={d.label}>
          <span className="hb-label" title={d.label}>
            {d.label}
          </span>
          <span className="hb-track">
            <span
              className="hb-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                ...(d.color ? { background: d.color } : null),
              }}
            />
          </span>
          <span className="hb-val">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

function niceCeil(v: number): number {
  if (v <= 10) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (mag / 2)) * (mag / 2)
}
