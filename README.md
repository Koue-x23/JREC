# JREC Stainless Steel Fabrication — Business Management System

A complete, direct-access business management web application built specifically for
**JREC Stainless Steel Fabrication** — R. Castillo St., Agdao, Davao City, Philippines 8000 · 0910 232 4612.

> **No login. No sign-up. No authentication.** Open the site and the Dashboard is there.
> This is a pure business website / management system, not an admin template.

## What's inside

| Module | Highlights |
| --- | --- |
| **Dashboard** | KPIs (customers, active jobs, quotations, unpaid/overdue, collections, receivables), monthly sales & payment charts, aging analysis, jobs/quotations by status, recent activity, quick actions |
| **Customers** | Full registry + profile page with complete transaction history (quotations, jobs, service reports, invoices, payments, statements) |
| **Quotations** | Auto-numbered `QUO-00001…`, line items, discount/tax, validity, statuses, duplicate, print/PDF, **Create Job from Quotation** (one click) |
| **Jobs / Projects** | Auto-numbered `JOB-00001…`, fabricator assignment, statuses, and a **project timeline**: Quotation → Approved → Job Started → Service Report → Invoice → Payment → Completed |
| **Service Reports** | Auto-numbered `SR-00001…`, A4 print-ready document with problem / work performed / materials / technician / **customer acknowledgment** |
| **Invoices** | Auto-numbered `INV-00001…`, automatic totals, amount paid & balance, payment status (Unpaid / Partially Paid / Paid / Overdue), print/PDF, record payment |
| **Payments** | Auto-numbered `PAY-00001…`, Cash / Bank Transfer / GCash / Other; recording a payment instantly updates the invoice, customer history and dashboard |
| **Billing Statements** | Auto-numbered `BS-00001…`, generated from customer transactions with previous balance, new invoices, payments, adjustments and current balance |
| **Reports** | Sales (daily/weekly/monthly/yearly), payments, outstanding receivables, overdue invoices, customers, jobs, quotations, service reports — all filterable by date range + customer, with charts, totals and print |
| **Settings** | Business info & logo, document defaults, editable numbering sequences, backup export/restore, sample data |

**Smart search** (top bar, `Ctrl+K` or `/`) searches across every record — `Juan` finds all of Juan's
transactions, `INV-00012` jumps straight to the invoice, `JOB-00008` opens the project.

**Automatic document connection:** Customer → Quotation → Approved → Job → Service Report →
Invoice → Payment → Billing Statement. Customer and project information carries forward —
never typed twice.

**Printing:** Quotation, Service Report, Invoice and Billing Statement each render as an
A4 engineering-drawing-style sheet (double frame + title block). *Print / Save as PDF* strips
the app chrome and prints only the document.

## Tech

- React 18 + TypeScript + Vite
- Custom industrial design system (steel/blueprint aesthetic, signal-red accents, measurement-tick stat cards, technical grid backgrounds) — no UI kit
- Dependency-free SVG charts
- Clean layering: `src/lib` (types, compute, storage adapters, selectors, search, seed) · `src/context` (data + toasts) · `src/components` (reusable UI, charts, forms, documents) · `src/pages` (one per module)
- Fully responsive: sidebar becomes a drawer, tables become cards, forms go single-column on mobile

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

The app opens **directly at `/` on the Dashboard**. On first run it loads a realistic sample
dataset (a fully connected quotation→job→invoice→payment story) so every screen is alive.
Clear it any time in **Settings ▸ Data** and start your real book.

## Data storage

The system runs on a pluggable storage layer (`src/lib/storage`):

- **Default — local device storage.** Works instantly, no configuration. Records persist in the browser.
- **Supabase cloud database (recommended for multi-device).** Database only — **no Supabase Auth, no user accounts, ever**:
  1. Create a free project at [supabase.com](https://supabase.com)
  2. SQL Editor → paste & run [`supabase/schema.sql`](supabase/schema.sql)
     (creates `customers`, `quotations`, `quotation_items`, `jobs`, `service_reports`,
     `invoices`, `invoice_items`, `payments`, `billing_statements`, `document_sequences`,
     `business_settings` + the atomic `next_doc_number()` function)
  3. Copy `.env.example` → `.env`, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  4. Restart the dev server / rebuild — the app switches to the cloud automatically

Settings ▸ Data shows the active storage, plus **Download Backup / Restore** (JSON export/import)
so records are never locked in.

## Document numbering

`QUO-00001`, `JOB-00001`, `SR-00001`, `INV-00001`, `PAY-00001`, `BS-00001`, `CUST-00001` —
allocated atomically, never duplicated, and configurable (prefix + next number) in
Settings ▸ Numbering Sequences.
