-- Contractor workflow and work-evidence authorization.
-- Run this in Supabase SQL Editor after the existing maintenance schema.
-- This migration intentionally scopes contractor access to jobs assigned to
-- the contractor_id stored on the authenticated user's profiles row.

alter table public.maintenance_jobs enable row level security;
alter table public.job_attachments enable row level security;

-- Contractors can view only their assigned maintenance jobs.
drop policy if exists "Contractors can view assigned maintenance jobs" on public.maintenance_jobs;
create policy "Contractors can view assigned maintenance jobs"
on public.maintenance_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and p.contractor_id = maintenance_jobs.contractor_id
  )
);

-- Contractors can update only their assigned maintenance jobs.
drop policy if exists "Contractors can update assigned maintenance jobs" on public.maintenance_jobs;
create policy "Contractors can update assigned maintenance jobs"
on public.maintenance_jobs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and p.contractor_id = maintenance_jobs.contractor_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and p.contractor_id = maintenance_jobs.contractor_id
  )
);

-- Contractors can add evidence only to their assigned jobs.
drop policy if exists "Contractors can upload assigned job evidence" on public.job_attachments;
create policy "Contractors can upload assigned job evidence"
on public.job_attachments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.maintenance_jobs j on j.contractor_id = p.contractor_id
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and j.id = job_attachments.job_id
  )
);

-- Contractors can view evidence belonging to their assigned jobs.
drop policy if exists "Contractors can view assigned job evidence" on public.job_attachments;
create policy "Contractors can view assigned job evidence"
on public.job_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.maintenance_jobs j on j.contractor_id = p.contractor_id
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and j.id = job_attachments.job_id
  )
);

-- Storage path convention used by the application:
-- jobs/<maintenance_job_uuid>/<uuid>-<filename>
drop policy if exists "Contractors can upload assigned job evidence files" on storage.objects;
create policy "Contractors can upload assigned job evidence files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-files'
  and exists (
    select 1
    from public.profiles p
    join public.maintenance_jobs j on j.contractor_id = p.contractor_id
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and j.id::text = split_part(name, '/', 2)
  )
);

-- Allow contractors to read their own assigned-job evidence files.
drop policy if exists "Contractors can view assigned job evidence files" on storage.objects;
create policy "Contractors can view assigned job evidence files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'maintenance-files'
  and exists (
    select 1
    from public.profiles p
    join public.maintenance_jobs j on j.contractor_id = p.contractor_id
    join public.job_attachments a on a.job_id = j.id and a.file_path = name
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
  )
);


-- Prevent a contractor from changing assignment, cost, branch, asset, or HQ-controlled fields
-- through a direct Supabase update. The UI only sends the allowed work fields, but this trigger
-- protects the database API as well.
create or replace function public.protect_contractor_job_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contractor_user boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and p.contractor_id = old.contractor_id
  ) into contractor_user;

  if contractor_user then
    if new.id is distinct from old.id
      or new.job_number is distinct from old.job_number
      or new.branch_id is distinct from old.branch_id
      or new.asset_id is distinct from old.asset_id
      or new.contractor_id is distinct from old.contractor_id
      or new.category is distinct from old.category
      or new.priority is distinct from old.priority
      or new.problem_description is distinct from old.problem_description
      or new.reported_by is distinct from old.reported_by
      or new.reported_at is distinct from old.reported_at
      or new.due_at is distinct from old.due_at
      or new.estimated_cost is distinct from old.estimated_cost
      or new.actual_cost is distinct from old.actual_cost
      or new.hq_remarks is distinct from old.hq_remarks
      or new.assigned_at is distinct from old.assigned_at
      or new.branch_verified_at is distinct from old.branch_verified_at
      or new.closed_at is distinct from old.closed_at
    then
      raise exception 'Contractors may only update assigned work workflow fields.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_contractor_job_update on public.maintenance_jobs;
create trigger protect_contractor_job_update
before update on public.maintenance_jobs
for each row execute function public.protect_contractor_job_update();

-- Contractor workflow history is limited to jobs assigned to their contractor account.
drop policy if exists "Contractors can add assigned job workflow history" on public.job_updates;
create policy "Contractors can add assigned job workflow history"
on public.job_updates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.maintenance_jobs j on j.contractor_id = p.contractor_id
    where p.id = auth.uid()
      and p.role = 'CONTRACTOR'
      and p.is_active = true
      and j.id = job_updates.job_id
  )
);
