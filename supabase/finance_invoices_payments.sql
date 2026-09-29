-- Finance extension for the Dunkin' Maintenance Control Tower.
-- Run this in Supabase SQL Editor after the existing maintenance schema.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  po_id uuid not null references public.purchase_orders(id) on delete restrict,
  job_id uuid not null references public.maintenance_jobs(id) on delete restrict,
  contractor_id uuid references public.contractors(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  invoice_date date not null default current_date,
  due_date date,
  subtotal numeric(12,2) not null default 0,
  sst_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'DRAFT',
  submitted_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  payment_status text not null default 'UNPAID',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text unique not null,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(12,2) not null default 0,
  payment_method text,
  payment_reference text,
  status text not null default 'RECORDED',
  paid_by text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_po_id_idx on public.invoices(po_id);
create index if not exists invoices_job_id_idx on public.invoices(job_id);
create index if not exists invoices_contractor_id_idx on public.invoices(contractor_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_status_idx on public.payments(status);

alter table public.invoices enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Finance can view invoices" on public.invoices;
drop policy if exists "Management can view invoices" on public.invoices;
drop policy if exists "Contractors can view own invoices" on public.invoices;
drop policy if exists "Finance can manage invoices" on public.invoices;
drop policy if exists "Contractors can create own invoices" on public.invoices;

create policy "Finance can view invoices" on public.invoices for select to authenticated using (public.is_finance() or public.is_hq_admin());
create policy "Management can view invoices" on public.invoices for select to authenticated using (public.is_management() or public.is_hq_admin());
create policy "Contractors can view own invoices" on public.invoices for select to authenticated using (contractor_id = public.get_my_contractor_id());
create policy "Finance can manage invoices" on public.invoices for all to authenticated using (public.is_finance() or public.is_hq_admin()) with check (public.is_finance() or public.is_hq_admin());
create policy "Contractors can create own invoices" on public.invoices for insert to authenticated with check (contractor_id = public.get_my_contractor_id());

-- Finance/management/contractor visibility. Payment writes are intentionally restricted to Finance/HQ Admin.
drop policy if exists "Finance can view payments" on public.payments;
drop policy if exists "Management can view payments" on public.payments;
drop policy if exists "Contractors can view own payments" on public.payments;
drop policy if exists "Finance can manage payments" on public.payments;

create policy "Finance can view payments" on public.payments for select to authenticated using (public.is_finance() or public.is_hq_admin());
create policy "Management can view payments" on public.payments for select to authenticated using (public.is_management() or public.is_hq_admin());
create policy "Contractors can view own payments" on public.payments for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and i.contractor_id = public.get_my_contractor_id()));
create policy "Finance can manage payments" on public.payments for all to authenticated using (public.is_finance() or public.is_hq_admin()) with check (public.is_finance() or public.is_hq_admin());
