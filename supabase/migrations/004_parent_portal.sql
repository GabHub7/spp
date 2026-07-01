-- ============================================================
-- 004_parent_portal.sql — Orang Tua (parent) self-service portal
-- Adds the ORANG_TUA role, parent↔student link, payment
-- verification fields, and a storage bucket for QRIS image +
-- payment proof uploads.
-- ============================================================

-- New role: Orang Tua (parent who pays online).
insert into roles (name, label) values ('ORANG_TUA', 'Orang Tua')
on conflict (name) do nothing;

-- Link a student to the parent user account that manages payments.
alter table students add column if not exists parent_user_id uuid references users(id) on delete set null;
create index if not exists idx_students_parent on students(parent_user_id);

-- Verification metadata for online (transfer / QRIS) payments.
alter table payments add column if not exists verified_by uuid references users(id) on delete set null;
alter table payments add column if not exists verified_at timestamptz;

-- A parent's online submission starts as PENDING and only marks the
-- bill PAID once a staff member verifies it. Allow many pending payments
-- per bill historically, but only one active (PENDING/SUCCESS) at a time.
create unique index if not exists uniq_active_payment_per_bill
  on payments (bill_id)
  where status in ('PENDING', 'SUCCESS') and is_deleted = false;

-- ── Storage bucket for uploads (QRIS image, transfer/QRIS proofs) ──
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Public read; all writes happen server-side via the service role
-- (which bypasses RLS) through authenticated API routes.
drop policy if exists "uploads_public_read" on storage.objects;
create policy "uploads_public_read" on storage.objects
  for select using (bucket_id = 'uploads');
