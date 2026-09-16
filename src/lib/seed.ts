import type {
  BillingStatement,
  Customer,
  Invoice,
  Job,
  LineItem,
  Payment,
  Quotation,
  ServiceReport,
  StatementEntry,
} from './types'
import { DEFAULT_SETTINGS } from './types'
import { addDays, round2, todayStr, uid } from './format'
import { computeTotals, deriveInvoice } from './compute'

/**
 * Sample dataset — a realistic, fully-connected history:
 * customers → quotations → jobs → service reports → invoices → payments → statements.
 * Dates are generated relative to today so charts always look alive.
 */

const T = todayStr()
const ago = (n: number) => addDays(T, -n)
const ahead = (n: number) => addDays(T, n)

let seq = 0
function stamp(day: string): string {
  seq += 1
  return `${day}T08:${String(seq % 60).padStart(2, '0')}:00.000Z`
}

function item(description: string, quantity: number, unit: string, unit_price: number): LineItem {
  return { id: uid(), description, quantity, unit, unit_price }
}

const CID = {
  marina: 'a10c0000-0000-4000-8000-000000000001',
  villanueva: 'a10c0000-0000-4000-8000-000000000002',
  clinic: 'a10c0000-0000-4000-8000-000000000003',
  jt: 'a10c0000-0000-4000-8000-000000000004',
  mbhome: 'a10c0000-0000-4000-8000-000000000005',
  sarmiento: 'a10c0000-0000-4000-8000-000000000006',
}

const FABRICATORS = ['Rico Ebarle', 'Jun Lumbo', 'Danny Cabigas', 'Allan Perez']

export function buildSeedData() {
  seq = 0

  // ── Customers (oldest first) ──────────────────────────────────────────────
  const customers: Customer[] = [
    {
      id: CID.marina, code: 'CUST-00001', name: 'Marina Dela Cruz',
      company: "Marina's Grill & Restaurant", phone: '0917 555 2314',
      email: 'marinasgrill.dvo@gmail.com', address: '118 Quimpo Blvd., Ecoland, Davao City',
      contact_person: 'Marina Dela Cruz',
      notes: 'Prefers Type 304 mirror finish on visible surfaces. Quarterly kitchen maintenance account.',
      date_added: ago(262), created_at: stamp(ago(262)),
    },
    {
      id: CID.villanueva, code: 'CUST-00002', name: 'Engr. Ramon Villanueva',
      company: 'Villanueva Construction', phone: '0922 847 1023',
      email: 'engr.rv@villanuevaconstruction.ph', address: 'km 7 McArthur Highway, Bangkal, Davao City',
      contact_person: 'Engr. Ramon Villanueva',
      notes: 'Contractor account — railings, canopies and structural works. Always requires a formal quotation with terms.',
      date_added: ago(240), created_at: stamp(ago(240)),
    },
    {
      id: CID.clinic, code: 'CUST-00003', name: 'Dr. Grace Lim',
      company: 'St. Gabriel Medical Clinic', phone: '082 305 4412',
      email: 'admin@stgabrielclinic.ph', address: 'Bauang St., Obrero, Davao City',
      contact_person: 'Ms. Ellen Razon (Admin)',
      notes: 'Hygiene-critical fixtures. Installs scheduled Sundays only while clinic is closed.',
      date_added: ago(220), created_at: stamp(ago(220)),
    },
    {
      id: CID.jt, code: 'CUST-00004', name: 'Joel Tan',
      company: 'J&T Catering Services', phone: '0930 711 8845',
      email: 'jandt.catering@gmail.com', address: 'R. Castillo St., Agdao, Davao City',
      contact_person: 'Joel Tan',
      notes: 'Neighbor along R. Castillo. Portable equipment on casters for event deployment.',
      date_added: ago(180), created_at: stamp(ago(180)),
    },
    {
      id: CID.mbhome, code: 'CUST-00005', name: 'Marites Bautista',
      company: 'MB Home Interiors', phone: '0995 220 6677',
      email: 'mbhomeinteriors@gmail.com', address: 'Poblacion, Matina, Davao City',
      contact_person: 'Marites Bautista',
      notes: 'Residential accounts — prefers hairline finish. Clients are particular about weld marks.',
      date_added: ago(150), created_at: stamp(ago(150)),
    },
    {
      id: CID.sarmiento, code: 'CUST-00006', name: 'Rodolfo Sarmiento',
      company: 'Sarmiento Cold Storage', phone: '0918 634 9021',
      email: 'sarmiento.coldstorage@yahoo.com', address: 'Sitio Ilang, Bunawan, Davao City',
      contact_person: 'Rodolfo Sarmiento',
      notes: 'Industrial grade work. Food-safe weld certification required on all joints.',
      date_added: ago(90), created_at: stamp(ago(90)),
    },
  ]

  // ── Quotations (chronological; numbers assigned in this order) ────────────
  const qid = (n: number) => `b20d0000-${String(n).padStart(4, '0')}-4000-8000-00000000000${n}`
  const rawQuotations: Array<Partial<Quotation> & { date: string }> = [
    {
      date: ago(190), customer_id: CID.marina, project_name: 'Kitchen Exhaust Hood & Ducting — Type 304',
      description: 'Fabrication and installation of kitchen exhaust system for the main cooking line.',
      items: [
        item('Exhaust hood assembly, Type 304, 2.4m × 1.2m × 0.9m, w/ baffle filters', 2, 'pcs', 58000),
        item('Round ducting 10" dia., Type 304, incl. hangers & supports', 14, 'm', 3200),
        item('Grease trap, Type 304, 80L', 1, 'pcs', 12000),
        item('Exhaust blower unit, 1.5HP, mounted & wired', 2, 'pcs', 8100),
      ],
      notes: 'Site visit completed. Existing ceiling opening to be reused.', status: 'Approved',
    },
    {
      date: ago(170), customer_id: CID.villanueva, project_name: 'Stainless Railing — Driveway Ramp',
      description: 'Supply and installation of driveway ramp railing for a two-storey residence project.',
      items: [
        item('Railing, Type 304 satin finish, 1.05m high, incl. posts & base plates', 25.8, 'sq.m.', 3500),
        item('Template & site layout', 1, 'lot', 4500),
      ],
      notes: 'Coordinate with Engr. Villanueva on post positions before drilling.', status: 'Approved',
    },
    {
      date: ago(100), customer_id: CID.clinic, project_name: 'Ward Fixtures & Wall Cladding',
      description: 'Ward renovation package — wall cladding, nurse station, IV poles and scrub sinks.',
      items: [
        item('Wall cladding, Type 304 hairline, incl. adhesives & trims', 28, 'sq.m.', 4200),
        item('Nurse station counter, fabricated 304, 2.4m', 1, 'set', 48000),
        item('IV pole, Type 304, w/ 4-caster base', 6, 'pcs', 3500),
        item('Scrub sink w/ elbow-action faucet', 2, 'pcs', 14500),
      ],
      notes: 'Sunday installs only. Phase 1: cladding + IV poles. Phase 2: station & sinks.', status: 'Approved',
    },
    {
      date: ago(80), customer_id: CID.jt, project_name: 'Catering Equipment Package',
      description: 'Mobile catering package — sinks, prep tables and warmer stations on heavy-duty casters.',
      items: [
        item('Mobile sink w/ casters, Type 304, double basin', 2, 'pcs', 18500),
        item('Prep table, Type 304, 2.0m × 0.7m, undershelf', 3, 'pcs', 21000),
        item('Food warmer station, 3-pan, w/ sneeze guard', 2, 'pcs', 24500),
      ],
      notes: 'All units fitted with 5" locking casters. Delivery to Agdao commissary.', status: 'Approved',
    },
    {
      date: ago(75), customer_id: CID.villanueva, project_name: 'Mezzanine Safety Grating',
      description: 'Safety grating for mezzanine walkway of the Bangkal warehouse.',
      items: [item('Safety grating, Type 304, w/ support cleats', 24, 'sq.m.', 5200)],
      notes: 'Subject to site re-measurement.', status: 'Pending', // will read Expired — valid_until past
    },
    {
      date: ago(60), customer_id: CID.sarmiento, project_name: 'Loading Dock Canopy',
      description: 'Loading dock canopy with stainless sheet over steel frame.',
      items: [item('Canopy, Type 304 sheet over steel frame, incl. installation', 42, 'sq.m.', 3900)],
      notes: 'Client opted for a tarpaulin canopy instead — declined October 2.', status: 'Rejected',
    },
    {
      date: ago(25), customer_id: CID.mbhome, project_name: 'Residential Stair Railing',
      description: 'Interior stair railing with tempered glass inserts for a Matina residence.',
      items: [
        item('Railing, Type 304 hairline, 1.0m high', 18, 'sq.m.', 4600),
        item('Tempered glass inserts, 10mm, w/ standoff brackets', 1, 'lot', 15000),
      ],
      notes: 'Color of brackets to follow client’s choice (black or satin).', status: 'Pending',
    },
    {
      date: ago(15), customer_id: CID.marina, project_name: 'Quarterly Kitchen Maintenance',
      description: 'Scheduled quarterly maintenance — degreasing, filter replacement and duct refastening.',
      items: [
        item('Deep clean & degrease of hood and ducting', 1, 'lot', 12000),
        item('Refasten ducting joints & replace gaskets', 1, 'lot', 4500),
      ],
      notes: 'To be scheduled on a Monday, kitchen closed.', status: 'Sent',
    },
    {
      date: ago(10), customer_id: CID.sarmiento, project_name: 'Cold Room Door Frames (Food-Grade)',
      description: 'Replacement of rusted cold room door frames with food-grade stainless assemblies.',
      items: [
        item('Door frame assembly, Type 304 food-grade, w/ thermal break', 4, 'pcs', 32000),
        item('Coving installation at floor joints', 1, 'lot', 18500),
      ],
      notes: 'Work scheduled around delivery slots; one door at a time.', status: 'Approved',
    },
    {
      date: ago(3), customer_id: CID.sarmiento, project_name: 'Handrail — Loading Steps (Type 304)',
      description: 'Fabrication and installation of handrail on the loading steps, food-grade finish.',
      items: [
        item('Handrail, Type 304, 1.1m high, w/ wall brackets', 12, 'm', 3200),
        item('Wall brackets, heavy-duty, satin finish', 14, 'pcs', 450),
      ],
      notes: 'Client approved over the phone — deposit expected this week.', status: 'Approved',
    },
    {
      date: ago(1), customer_id: CID.mbhome, project_name: 'Kitchen Island Countertop',
      description: 'Kitchen island countertop, hairline finish, with integrated drainboard.',
      items: [item('Countertop, Type 304 hairline, 2.4m × 0.9m, w/ drainboard & splash', 1, 'lot', 46000)],
      notes: '', status: 'Draft',
    },
  ]

  const quotations: Quotation[] = rawQuotations.map((q, i) => ({
    id: qid(i + 1),
    number: `QUO-${String(i + 1).padStart(5, '0')}`,
    date: q.date,
    valid_until: q.status === 'Rejected' ? addDays(q.date, 15) : addDays(q.date, 30),
    customer_id: q.customer_id!,
    project_name: q.project_name!,
    description: q.description ?? '',
    items: q.items ?? [],
    discount: 0,
    tax_rate: 0,
    notes: q.notes ?? '',
    terms: DEFAULT_SETTINGS.quotation_terms,
    status: q.status!,
    created_at: stamp(q.date),
  }))

  const Q = (n: number) => quotations[n - 1]

  // ── Jobs (from approved quotations, chronological) ────────────────────────
  const jid = (n: number) => `c30e0000-${String(n).padStart(4, '0')}-4000-8000-00000000000${n}`
  const jobs: Job[] = [
    {
      id: jid(1), number: 'JOB-00001', customer_id: CID.marina, quotation_id: Q(1).id,
      project_name: Q(1).project_name, description: Q(1).description,
      start_date: ago(185), expected_completion: ago(150), actual_completion: ago(158),
      fabricator: FABRICATORS[0], status: 'Completed',
      notes: 'Hood installed over the fryer and griddle stations. Blower tested at full load.',
      created_at: stamp(ago(186)),
    },
    {
      id: jid(2), number: 'JOB-00002', customer_id: CID.villanueva, quotation_id: Q(2).id,
      project_name: Q(2).project_name, description: Q(2).description,
      start_date: ago(160), expected_completion: ago(125), actual_completion: ago(127),
      fabricator: FABRICATORS[1], status: 'Completed',
      notes: 'Base plates anchored on the new ramp concrete. Turned over to Engr. Villanueva.',
      created_at: stamp(ago(161)),
    },
    {
      id: jid(3), number: 'JOB-00003', customer_id: CID.clinic, quotation_id: Q(3).id,
      project_name: Q(3).project_name, description: Q(3).description,
      start_date: ago(20), expected_completion: ahead(12), actual_completion: '',
      fabricator: FABRICATORS[3], status: 'In Progress',
      notes: 'Phase 1 cladding underway. Nurse station fabrication in shop.',
      created_at: stamp(ago(21)),
    },
    {
      id: jid(4), number: 'JOB-00004', customer_id: CID.jt, quotation_id: Q(4).id,
      project_name: Q(4).project_name, description: Q(4).description,
      start_date: ago(15), expected_completion: ahead(20), actual_completion: '',
      fabricator: FABRICATORS[2], status: 'On Hold',
      notes: 'Client requested to hold production until the Kadayawan peak ends. Resume target mid-October.',
      created_at: stamp(ago(16)),
    },
    {
      id: jid(5), number: 'JOB-00005', customer_id: CID.sarmiento, quotation_id: Q(9).id,
      project_name: Q(9).project_name, description: Q(9).description,
      start_date: ahead(6), expected_completion: ahead(36), actual_completion: '',
      fabricator: FABRICATORS[0], status: 'Pending',
      notes: 'Awaiting 50% down payment. Materials list already prepared.',
      created_at: stamp(ago(9)),
    },
  ]
  const J = (n: number) => jobs[n - 1]

  // ── Service reports (chronological) ───────────────────────────────────────
  const sid = (n: number) => `d40f0000-${String(n).padStart(4, '0')}-4000-8000-00000000000${n}`
  const service_reports: ServiceReport[] = [
    {
      id: sid(1), number: 'SR-00001', service_date: ago(158), customer_id: CID.marina,
      location: "Marina's Grill — main kitchen, Quimpo Blvd.", job_id: J(1).id,
      item_product: 'Kitchen exhaust hood & ducting assembly',
      problem_request: 'Installation follow-through: test run of full exhaust system under load.',
      work_performed:
        'Completed hood mounting, sealed duct joints with high-temp gasket, mounted and wired both blower units. Full-load test for 45 minutes — airflow normal, no leaks observed.',
      materials_used: 'High-temp gasket rolls (6m), stainless anchors (24), silicone sealant (3), wiring bits',
      status: 'Completed', technician: FABRICATORS[0],
      remarks: 'Advised kitchen staff on weekly filter cleaning schedule.',
      acknowledged_by: 'Marina Dela Cruz', acknowledged_at: ago(158), created_at: stamp(ago(158)),
    },
    {
      id: sid(2), number: 'SR-00002', service_date: ago(127), customer_id: CID.villanueva,
      location: 'Driveway ramp, Bangkal residence project', job_id: J(2).id,
      item_product: 'Stainless driveway railing',
      problem_request: 'Final installation and turnover of railing assembly.',
      work_performed:
        'Installed remaining railing panels, torqued base plate anchors, polished weld points, and applied passivation solution on exposed joints.',
      materials_used: 'Anchors (32), passivation solution (1L), polishing compounds',
      status: 'Completed', technician: FABRICATORS[1],
      remarks: 'Turned over to Engr. Villanueva with maintenance sheet.',
      acknowledged_by: 'Engr. Ramon Villanueva', acknowledged_at: ago(127), created_at: stamp(ago(127)),
    },
    {
      id: sid(3), number: 'SR-00003', service_date: ago(112), customer_id: CID.marina,
      location: "Marina's Grill — fryer station", job_id: null,
      item_product: 'Hood baffle filters',
      problem_request: 'Reported grease dripping from hood edge above the fryer.',
      work_performed:
        'Removed and deep-cleaned 6 baffle filters, replaced 2 corroded units, refastened filter frame and re-sealed the hood lip.',
      materials_used: 'Baffle filter Type 304 (2), degreaser (2L), sheet screws',
      status: 'Completed', technician: FABRICATORS[2],
      remarks: 'Recommended scheduling the quarterly maintenance package.',
      acknowledged_by: 'Marina Dela Cruz', acknowledged_at: ago(112), created_at: stamp(ago(112)),
    },
    {
      id: sid(4), number: 'SR-00004', service_date: ago(5), customer_id: CID.clinic,
      location: 'St. Gabriel Medical Clinic — Ward 2', job_id: J(3).id,
      item_product: 'Wall cladding, Type 304 hairline',
      problem_request: 'Phase 1 cladding installation for Ward 2.',
      work_performed:
        'Installed 12 sq.m. of wall cladding with hygienic coving at corners; seams sealed with food-grade silicone. Remaining area to follow next Sunday.',
      materials_used: 'Type 304 hairline sheets (12 sq.m.), coving trims (8), food-grade silicone (4)',
      status: 'Completed', technician: FABRICATORS[3],
      remarks: 'IV poles delivered and mounted; nurse station still in shop fabrication.',
      acknowledged_by: 'Ms. Ellen Razon', acknowledged_at: ago(5), created_at: stamp(ago(5)),
    },
    {
      id: sid(5), number: 'SR-00005', service_date: ago(2), customer_id: CID.clinic,
      location: 'St. Gabriel Medical Clinic — corridor', job_id: J(3).id,
      item_product: 'Corridor cladding, Phase 2 prep',
      problem_request: 'Site measurement and substrate check for Phase 2.',
      work_performed: 'Measured corridor walls (16 sq.m.), checked substrate flatness, marked layout lines for panel cuts.',
      materials_used: 'Layout markers, measuring tape',
      status: 'In Progress', technician: FABRICATORS[3],
      remarks: 'Panel cutting to start in shop once Phase 1 is signed off.',
      acknowledged_by: '', acknowledged_at: '', created_at: stamp(ago(2)),
    },
  ]

  // ── Invoices (chronological; numbers assigned in this order) ──────────────
  const iid = (n: number) => `e5100000-${String(n).padStart(4, '0')}-4000-8000-0000000000${String(n).padStart(2, '0')}`
  const rawInvoices: Array<{
    date: string; due: string; customer_id: string; job_id: string | null
    project_name: string; items: LineItem[]; notes?: string
  }> = [
    {
      date: ago(155), due: ago(140), customer_id: CID.marina, job_id: J(1).id,
      project_name: 'Kitchen Exhaust Hood & Ducting — Type 304 (full billing)',
      items: Q(1).items,
    },
    {
      date: ago(125), due: ago(110), customer_id: CID.villanueva, job_id: J(2).id,
      project_name: 'Stainless Railing — Driveway Ramp (full billing)',
      items: Q(2).items,
    },
    {
      date: ago(110), due: ago(95), customer_id: CID.marina, job_id: null,
      project_name: 'Hood baffle filter repair & replacement',
      items: [
        item('On-site repair — deep clean, refasten & re-seal hood lip', 1, 'lot', 5500),
        item('Baffle filter, Type 304, replacement', 2, 'pcs', 1500),
      ],
      notes: 'Per service report SR-00003.',
    },
    {
      date: ago(92), due: ago(77), customer_id: CID.jt, job_id: null,
      project_name: 'Banquet tables w/ casters — rush order',
      items: [item('Banquet table, Type 304, 1.8m × 0.75m, w/ 5" locking casters', 6, 'pcs', 7700)],
      notes: 'Rush order outside the equipment package — delivered to commissary.',
    },
    {
      date: ago(70), due: ago(55), customer_id: CID.clinic, job_id: null,
      project_name: 'Aircon drain pans & fixture repairs',
      items: [
        item('Drain pan, Type 304, custom-fit', 8, 'pcs', 1850),
        item('Fixture repairs — brackets & re-welds', 1, 'lot', 7200),
      ],
    },
    {
      date: ago(12), due: ahead(3), customer_id: CID.clinic, job_id: J(3).id,
      project_name: 'Ward Fixtures — Phase 1 progress billing',
      items: [
        item('Wall cladding, Type 304 hairline — Phase 1 (12 sq.m. installed)', 12, 'sq.m.', 4200),
        item('IV pole, Type 304, w/ 4-caster base (delivered & mounted)', 6, 'pcs', 3500),
      ],
      notes: 'Progress billing per service report SR-00004.',
    },
    {
      date: ago(6), due: ahead(9), customer_id: CID.clinic, job_id: J(3).id,
      project_name: 'Ward Fixtures — Phase 2 progress billing',
      items: [item('Wall cladding, Type 304 hairline — Phase 2 (16 sq.m.)', 16, 'sq.m.', 4200)],
      notes: 'Bill as measured; final adjustment upon completion.',
    },
    {
      date: ago(4), due: ahead(11), customer_id: CID.villanueva, job_id: null,
      project_name: 'Site repair — canopy gutter re-pitching',
      items: [item('Re-pitch & re-seal canopy gutters, Bangkal site', 1, 'lot', 15750)],
    },
  ]

  const invoices: Invoice[] = rawInvoices.map((r, i) => {
    const inv: Invoice = {
      id: iid(i + 1),
      number: `INV-${String(i + 1).padStart(5, '0')}`,
      invoice_date: r.date,
      due_date: r.due,
      customer_id: r.customer_id,
      job_id: r.job_id,
      project_name: r.project_name,
      items: r.items,
      discount: 0,
      tax_rate: 0,
      notes: r.notes ?? '',
      status: 'Unpaid',
      created_at: stamp(r.date),
    }
    return inv
  })
  const I = (n: number) => invoices[n - 1]

  // ── Payments (chronological; amounts derived from invoice totals) ────────
  const mk = (
    date: string, customer_id: string, invoice: Invoice, amount: number,
    method: Payment['method'], reference: string, notes = '',
  ): Payment => ({
    id: uid(), number: '', date, customer_id, invoice_id: invoice.id,
    amount, method, reference, notes, created_at: stamp(date),
  })

  const payments: Payment[] = [
    mk(ago(152), CID.marina, I(1), round2(computeTotals(I(1).items, 0, 0).total / 2), 'Bank Transfer', 'DP-MAR-0228', '50% down payment as per terms'),
    mk(ago(130), CID.marina, I(1), round2(computeTotals(I(1).items, 0, 0).total / 2), 'Cash', '', 'Balance on completion'),
    mk(ago(120), CID.villanueva, I(2), computeTotals(I(2).items, 0, 0).total, 'GCash', '0729-8412', 'Full payment on turnover'),
    mk(ago(108), CID.marina, I(3), computeTotals(I(3).items, 0, 0).total, 'Cash', '', 'Paid on-site after repair'),
    mk(ago(88), CID.jt, I(4), 20000, 'GCash', '0815-3307', 'Partial payment'),
    mk(ago(72), CID.jt, I(4), round2(computeTotals(I(4).items, 0, 0).total - 20000), 'Bank Transfer', 'BPI-55231', 'Remaining balance'),
    mk(ago(40), CID.clinic, I(5), 10000, 'Bank Transfer', 'BDO-77412', 'Partial payment for drain pans'),
    mk(ago(9), CID.clinic, I(6), 30000, 'GCash', '0907-1180', 'Phase 1 down'),
  ].map((p, i) => ({ ...p, number: `PAY-${String(i + 1).padStart(5, '0')}` }))

  // Store the derived status on each invoice.
  for (const inv of invoices) {
    inv.status = deriveInvoice(inv, payments).status
  }

  // ── Billing statements ────────────────────────────────────────────────────
  const bsid = (n: number) => `07320000-000${n}-4000-8000-00000000000${n}`
  const statementFor = (
    n: number, date: string, customer_id: string, period_start: string, period_end: string,
    entries: StatementEntry[], notes: string,
  ): BillingStatement => {
    const previous_balance = round2(entries.filter((e) => e.kind === 'Previous Balance').reduce((s, e) => s + e.amount, 0))
    const adjustments = round2(entries.filter((e) => e.kind === 'Adjustment').reduce((s, e) => s + e.amount, 0))
    const charges = round2(entries.filter((e) => e.kind === 'Invoice').reduce((s, e) => s + e.amount, 0))
    const credits = round2(entries.filter((e) => e.kind === 'Payment').reduce((s, e) => s + e.amount, 0))
    return {
      id: bsid(n), number: `BS-${String(n).padStart(5, '0')}`, date, customer_id,
      period_start, period_end, previous_balance, adjustments,
      current_balance: round2(previous_balance + charges + adjustments + credits),
      entries, notes, created_at: stamp(date),
    }
  }

  const statements: BillingStatement[] = [
    statementFor(
      1, ago(125), CID.marina, ago(190), ago(130),
      [
        { kind: 'Invoice', date: I(1).invoice_date, ref: I(1).number, description: I(1).project_name ?? '', amount: computeTotals(I(1).items, 0, 0).total },
        { kind: 'Payment', date: ago(152), ref: 'PAY-00001', description: '50% down payment — Bank Transfer', amount: -round2(computeTotals(I(1).items, 0, 0).total / 2) },
        { kind: 'Payment', date: ago(130), ref: 'PAY-00002', description: 'Balance on completion — Cash', amount: -round2(computeTotals(I(1).items, 0, 0).total / 2) },
      ],
      'Thank you for your business.',
    ),
    statementFor(
      2, ago(45), CID.clinic, ago(80), ago(45),
      [
        { kind: 'Invoice', date: I(5).invoice_date, ref: I(5).number, description: I(5).project_name ?? '', amount: computeTotals(I(5).items, 0, 0).total },
        { kind: 'Payment', date: ago(40), ref: 'PAY-00007', description: 'Partial payment — Bank Transfer', amount: -10000 },
      ],
      'Kindly settle the remaining balance on or before the due date.',
    ),
  ]

  return {
    customers,
    quotations,
    jobs,
    service_reports,
    invoices,
    payments,
    statements,
  }
}
