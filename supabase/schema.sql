-- ═══════════════════════════════════════════════════════════════════════════
-- JREC STAINLESS STEEL FABRICATION — Business Management System
-- Supabase / PostgreSQL schema  (database ONLY — no authentication is used)
--
-- How to connect:
--   1. Create a free project at https://supabase.com
--   2. Open SQL Editor → paste this file → Run
--   3. In the app repo, copy .env.example to .env and fill:
--        VITE_SUPABASE_URL=https://<project>.supabase.co
--        VITE_SUPABASE_ANON_KEY=<anon key>
--   4. Restart/rebuild — the app switches to cloud storage automatically.
--
-- Security note: this is a direct-access business tool with no user accounts,
-- so the anon key is allowed to read/write business data (policies below).
-- There is NO auth schema usage — no users, no sessions, no login.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── customers ───────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id             uuid primary key,
  code           text not null unique,
  name           text not null default '',
  company        text not null default '',
  phone          text not null default '',
  email          text not null default '',
  address        text not null default '',
  contact_person text not null default '',
  notes          text not null default '',
  date_added     date not null default current_date,
  created_at     timestamptz not null default now()
);

-- ── quotations + items ──────────────────────────────────────────────────────
create table if not exists public.quotations (
  id            uuid primary key,
  number        text not null unique,
  date          date not null,
  valid_until   date,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  project_name  text not null default '',
  description   text not null default '',
  discount      numeric(14,2) not null default 0,
  tax_rate      numeric(6,2)  not null default 0,
  notes         text not null default '',
  terms         text not null default '',
  status        text not null default 'Draft'
                check (status in ('Draft','Sent','Pending','Approved','Rejected','Expired')),
  created_at    timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id            uuid primary key,
  quotation_id  uuid not null references public.quotations(id) on delete cascade,
  description   text not null default '',
  quantity      numeric(14,3) not null default 1,
  unit          text not null default 'pcs',
  unit_price    numeric(14,2) not null default 0,
  sort_index    int not null default 0
);

-- ── jobs ────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id                  uuid primary key,
  number              text not null unique,
  customer_id         uuid not null references public.customers(id) on delete cascade,
  quotation_id        uuid references public.quotations(id) on delete set null,
  project_name        text not null default '',
  description         text not null default '',
  start_date          date,
  expected_completion date,
  actual_completion   date,
  fabricator          text not null default '',
  status              text not null default 'Pending'
                      check (status in ('Pending','In Progress','On Hold','Completed','Cancelled')),
  notes               text not null default '',
  created_at          timestamptz not null default now()
);

-- ── service reports ─────────────────────────────────────────────────────────
create table if not exists public.service_reports (
  id               uuid primary key,
  number           text not null unique,
  service_date     date not null,
  customer_id      uuid not null references public.customers(id) on delete cascade,
  location         text not null default '',
  job_id           uuid references public.jobs(id) on delete set null,
  item_product     text not null default '',
  problem_request  text not null default '',
  work_performed   text not null default '',
  materials_used   text not null default '',
  status           text not null default 'Pending'
                   check (status in ('Pending','In Progress','Completed')),
  technician       text not null default '',
  remarks          text not null default '',
  acknowledged_by  text not null default '',
  acknowledged_at  date,
  created_at       timestamptz not null default now()
);

-- ── invoices + items ────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id            uuid primary key,
  number        text not null unique,
  invoice_date  date not null,
  due_date      date not null,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  job_id        uuid references public.jobs(id) on delete set null,
  project_name  text not null default '',
  discount      numeric(14,2) not null default 0,
  tax_rate      numeric(6,2)  not null default 0,
  notes         text not null default '',
  status        text not null default 'Unpaid'
                check (status in ('Unpaid','Partially Paid','Paid','Overdue')),
  created_at    timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id           uuid primary key,
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null default '',
  quantity     numeric(14,3) not null default 1,
  unit         text not null default 'pcs',
  unit_price   numeric(14,2) not null default 0,
  sort_index   int not null default 0
);

-- ── payments ────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id          uuid primary key,
  number      text not null unique,
  date        date not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  method      text not null default 'Cash'
              check (method in ('Cash','Bank Transfer','GCash','Other')),
  reference   text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ── billing statements ──────────────────────────────────────────────────────
create table if not exists public.billing_statements (
  id               uuid primary key,
  number           text not null unique,
  date             date not null,
  customer_id      uuid not null references public.customers(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  previous_balance numeric(14,2) not null default 0,
  adjustments      numeric(14,2) not null default 0,
  current_balance  numeric(14,2) not null default 0,
  entries          jsonb not null default '[]'::jsonb,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

-- ── document sequences (atomic numbering) ───────────────────────────────────
create table if not exists public.document_sequences (
  doc_type    text primary key,
  prefix      text not null,
  next_number integer not null default 1 check (next_number > 0)
);

insert into public.document_sequences (doc_type, prefix, next_number) values
  ('CUST','CUST',1), ('QUO','QUO',1), ('JOB','JOB',1), ('SR','SR',1),
  ('INV','INV',1), ('PAY','PAY',1), ('BS','BS',1)
on conflict (doc_type) do nothing;

-- Atomic allocation of the next document number, e.g. QUO-00042.
create or replace function public.next_doc_number(p_doc_type text)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_num    integer;
begin
  update public.document_sequences
     set next_number = next_number + 1
   where doc_type = p_doc_type
  returning prefix, next_number - 1 into v_prefix, v_num;

  if v_num is null then
    insert into public.document_sequences (doc_type, prefix, next_number)
    values (p_doc_type, upper(p_doc_type), 2)
    returning prefix, 1 into v_prefix, v_num
    on conflict (doc_type) do update
      set next_number = public.document_sequences.next_number + 1
      returning prefix, public.document_sequences.next_number - 1 into v_prefix, v_num;
  end if;

  return v_prefix || '-' || lpad(v_num::text, 5, '0');
end;
$$;

-- ── business settings (single row) ─────────────────────────────────────────
create table if not exists public.business_settings (
  id                    int primary key default 1 check (id = 1),
  business_name         text not null default 'JREC Stainless Steel Fabrication',
  address               text not null default 'R. Castillo St., Agdao, Davao City, Philippines 8000',
  phone                 text not null default '0910 232 4612',
  email                 text not null default '',
  logo                  text not null default '',
  tax_rate              numeric(6,2)  not null default 0,
  quotation_valid_days  int not null default 30,
  invoice_due_days      int not null default 15,
  quotation_terms       text not null default '',
  invoice_notes         text not null default '',
  sequences             jsonb not null default '{}'::jsonb
);

insert into public.business_settings (id) values (1) on conflict (id) do nothing;

-- ── indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_quotations_customer on public.quotations(customer_id);
create index if not exists idx_jobs_customer        on public.jobs(customer_id);
create index if not exists idx_jobs_quotation       on public.jobs(quotation_id);
create index if not exists idx_sr_customer          on public.service_reports(customer_id);
create index if not exists idx_sr_job               on public.service_reports(job_id);
create index if not exists idx_invoices_customer    on public.invoices(customer_id);
create index if not exists idx_invoices_job         on public.invoices(job_id);
create index if not exists idx_payments_customer    on public.payments(customer_id);
create index if not exists idx_payments_invoice     on public.payments(invoice_id);
create index if not exists idx_statements_customer  on public.billing_statements(customer_id);

-- ── row level security: direct-access business app, no auth ────────────────
-- The application uses only the anon key (no sign-in of any kind), so the
-- business tables are readable/writable through the API for this project.
alter table public.customers           enable row level security;
alter table public.quotations          enable row level security;
alter table public.quotation_items     enable row level security;
alter table public.jobs                enable row level security;
alter table public.service_reports     enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_items       enable row level security;
alter table public.payments            enable row level security;
alter table public.billing_statements  enable row level security;
alter table public.document_sequences  enable row level security;
alter table public.business_settings   enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'customers','quotations','quotation_items','jobs','service_reports',
    'invoices','invoice_items','payments','billing_statements',
    'document_sequences','business_settings'
  ] loop
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      t || '_direct_access', t
    );
  end loop;
exception
  when duplicate_object then null;
end $$;
