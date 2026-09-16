import type { AllData } from './types'
import { computeTotals, quotationStatusOf } from './compute'
import { fmtDate } from './format'

export interface SearchResult {
  id: string
  kind: 'Customer' | 'Quotation' | 'Job' | 'Service Report' | 'Invoice' | 'Payment' | 'Statement'
  title: string
  subtitle: string
  meta: string
  to: string
  score: number
}

const LIMIT_PER_KIND = 4

function norm(s: string): string {
  return s.toLowerCase().trim()
}

export function searchAll(data: AllData, query: string): SearchResult[] {
  const q = norm(query)
  if (!q) return []
  const cust = (id: string) => data.customers.find((c) => c.id === id)

  const results: SearchResult[] = []

  const push = (r: SearchResult, haystack: string) => {
    if (!haystack) return
    let idx = haystack.indexOf(q)
    if (idx === -1) return
    // Exact document-number matches float to the top.
    r.score = norm(r.title) === q ? 100 : 50 - Math.min(idx, 40)
    results.push(r)
  }

  for (const c of data.customers) {
    push(
      {
        id: c.id, kind: 'Customer', title: c.name || c.company || c.code,
        subtitle: [c.company, c.code].filter(Boolean).join(' · '),
        meta: [c.phone, c.email].filter(Boolean).join(' · ') || 'No contact info',
        to: `/customers/${c.id}`, score: 0,
      },
      norm([c.name, c.company, c.code, c.phone, c.email, c.contact_person, c.address].join(' ')),
    )
  }

  for (const qu of data.quotations) {
    const c = cust(qu.customer_id)
    push(
      {
        id: qu.id, kind: 'Quotation', title: qu.number,
        subtitle: qu.project_name,
        meta: [c?.name ?? '', quotationStatusOf(qu), fmtDate(qu.date)].filter(Boolean).join(' · '),
        to: `/quotations/${qu.id}`, score: 0,
      },
      norm([qu.number, qu.project_name, qu.description, c?.name, c?.company].join(' ')),
    )
  }

  for (const j of data.jobs) {
    const c = cust(j.customer_id)
    push(
      {
        id: j.id, kind: 'Job', title: j.number,
        subtitle: j.project_name,
        meta: [c?.name ?? '', j.status, j.fabricator].filter(Boolean).join(' · '),
        to: `/jobs/${j.id}`, score: 0,
      },
      norm([j.number, j.project_name, j.description, j.fabricator, c?.name, c?.company].join(' ')),
    )
  }

  for (const s of data.service_reports) {
    const c = cust(s.customer_id)
    push(
      {
        id: s.id, kind: 'Service Report', title: s.number,
        subtitle: s.item_product || s.problem_request || 'Service report',
        meta: [c?.name ?? '', s.technician, s.status].filter(Boolean).join(' · '),
        to: `/service-reports/${s.id}`, score: 0,
      },
      norm([s.number, s.item_product, s.problem_request, s.work_performed, s.technician, s.location, c?.name, c?.company].join(' ')),
    )
  }

  for (const inv of data.invoices) {
    const c = cust(inv.customer_id)
    const paid = data.payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0)
    const t = computeTotals(inv.items, inv.discount, inv.tax_rate).total
    push(
      {
        id: inv.id, kind: 'Invoice', title: inv.number,
        subtitle: inv.project_name,
        meta: [c?.name ?? '', paid >= t ? 'Paid' : `Balance ₱${(t - paid).toLocaleString()}`, fmtDate(inv.invoice_date)].filter(Boolean).join(' · '),
        to: `/invoices/${inv.id}`, score: 0,
      },
      norm([inv.number, inv.project_name, inv.notes, c?.name, c?.company].join(' ')),
    )
  }

  for (const p of data.payments) {
    const c = cust(p.customer_id)
    const inv = data.invoices.find((i) => i.id === p.invoice_id)
    push(
      {
        id: p.id, kind: 'Payment', title: p.number,
        subtitle: `₱${p.amount.toLocaleString()} — ${p.method}`,
        meta: [c?.name ?? '', inv?.number ?? '', p.reference].filter(Boolean).join(' · '),
        to: `/payments?focus=${p.id}`, score: 0,
      },
      norm([p.number, p.method, p.reference, p.notes, c?.name, c?.company, inv?.number ?? ''].join(' ')),
    )
  }

  for (const b of data.statements) {
    const c = cust(b.customer_id)
    push(
      {
        id: b.id, kind: 'Statement', title: b.number,
        subtitle: `Statement of account — ${fmtDate(b.date)}`,
        meta: [c?.name ?? '', b.period_start, b.period_end].filter(Boolean).join(' · '),
        to: `/billing-statements/${b.id}`, score: 0,
      },
      norm([b.number, c?.name, c?.company, b.notes].join(' ')),
    )
  }

  results.sort((a, b) => b.score - a.score)

  // Keep at most N per kind so one customer doesn't flood the list.
  const perKind = new Map<string, number>()
  const out: SearchResult[] = []
  for (const r of results) {
    const n = perKind.get(r.kind) ?? 0
    if (n >= LIMIT_PER_KIND) continue
    perKind.set(r.kind, n + 1)
    out.push(r)
  }
  return out.slice(0, 12)
}
