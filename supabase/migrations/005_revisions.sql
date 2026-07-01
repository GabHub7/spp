-- ============================================================
-- 005_revisions.sql — Feature revisions
--   • Jenis pembayaran (bill types): SPP + Seragam/PTS/PAS/Daftar Ulang/Lainnya
--   • Cicilan (installment): partial payments via paid_amount + PARTIAL status
--   • Reset password by email: real e-mail stored on users / auth accounts
-- ============================================================

-- ── Bills: payment type, free-text title, and amount already paid ──
alter table bills add column if not exists bill_type   text not null default 'SPP';
alter table bills add column if not exists title       text;
alter table bills add column if not exists paid_amount numeric(12,2) not null default 0;

-- Existing fully-paid SPP bills are, by definition, paid in full.
update bills set paid_amount = amount where status = 'PAID' and paid_amount = 0;

-- The old "one bill per student / month" rule must only apply to SPP now, so
-- that several non-SPP bills (e.g. Seragam + PTS) can coexist in one period.
-- Drop the inline unique constraint from 001 and re-add it as a partial index.
do $$
declare cname text;
begin
  select conname into cname
    from pg_constraint
   where conrelid = 'bills'::regclass
     and contype  = 'u'
     and conname  = 'bills_student_id_academic_year_id_period_month_period_year_key';
  if cname is not null then
    execute format('alter table bills drop constraint %I', cname);
  end if;
end $$;

create unique index if not exists uniq_spp_bill_per_period
  on bills (student_id, academic_year_id, period_month, period_year)
  where bill_type = 'SPP';

create index if not exists idx_bills_type on bills(bill_type);

-- ── Payments: flag installment (cicilan) payments ──
alter table payments add column if not exists is_installment boolean not null default false;

-- Installments mean a bill can legitimately have many SUCCESS payments, so the
-- old "one active payment per bill" guard is replaced by one that still blocks
-- a parent from submitting two PENDING payments for the same bill.
drop index if exists uniq_active_payment_per_bill;
create unique index if not exists uniq_pending_payment_per_bill
  on payments (bill_id)
  where status = 'PENDING' and is_deleted = false;
