-- ============================================================
-- SIP-SPP — Sistem Informasi Pembayaran SPP — SMK Poncol Jakarta
-- 001_initial_schema.sql — core tables
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Roles & users ────────────────────────────────────────────
create table if not exists roles (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,          -- ADMIN | BENDAHARA | KEPALA_SEKOLAH
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  username      text not null unique,
  full_name     text not null,
  email         text,
  role_id       uuid not null references roles(id),
  status        text not null default 'ACTIVE',   -- ACTIVE | INACTIVE
  failed_logins int  not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Academic structure ──────────────────────────────────────
create table if not exists majors (              -- Jurusan
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists academic_years (      -- Tahun Ajaran
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,                -- "2026/2027"
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists classes (             -- Kelas
  id       uuid primary key default gen_random_uuid(),
  name     text not null,                        -- "X RPL 1"
  grade    text not null,                        -- X | XI | XII
  major_id uuid references majors(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists spp_rates (           -- Tarif SPP
  id               uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  amount           numeric(12,2) not null,
  note             text,
  created_at       timestamptz not null default now()
);

-- ── Students ─────────────────────────────────────────────────
create table if not exists students (            -- Siswa
  id               uuid primary key default gen_random_uuid(),
  nis              text not null unique,
  full_name        text not null,
  gender           text not null default 'L',    -- L | P
  class_id         uuid references classes(id) on delete set null,
  major_id         uuid references majors(id) on delete set null,
  academic_year_id uuid references academic_years(id) on delete set null,
  parent_name      text,
  parent_phone     text,
  address          text,
  status           text not null default 'ACTIVE', -- ACTIVE | GRADUATED | TRANSFERRED | DROPPED
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Bills (Tagihan) — one per student / month / academic year ─
create table if not exists bills (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  period_month     int  not null,                -- 1..12 (calendar month)
  period_year      int  not null,                -- calendar year of the period
  amount           numeric(12,2) not null,
  status           text not null default 'UNPAID', -- UNPAID | PAID
  is_locked        boolean not null default false,
  due_date         date,
  created_at       timestamptz not null default now(),
  unique (student_id, academic_year_id, period_month, period_year)
);

-- ── Payments (Pembayaran) ────────────────────────────────────
create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  transaction_no text not null unique,           -- SPP-YYYYMMDD-XXXX
  bill_id        uuid not null references bills(id) on delete cascade,
  student_id     uuid not null references students(id) on delete cascade,
  amount         numeric(12,2) not null,
  method         text not null default 'TUNAI',  -- TUNAI | TRANSFER | QRIS
  status         text not null default 'SUCCESS',-- PENDING | SUCCESS | FAILED | CANCELLED
  paid_at        timestamptz not null default now(),
  officer_id     uuid references users(id) on delete set null,
  officer_name   text,
  proof_url      text,
  note           text,
  is_deleted     boolean not null default false, -- soft delete only (BR-007)
  created_at     timestamptz not null default now()
);

-- ── Period locking (Periode Locking) ─────────────────────────
create table if not exists period_locks (
  id               uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  period_month     int  not null,
  period_year      int  not null,
  locked_by        uuid references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (academic_year_id, period_month, period_year)
);

-- ── Payment settings (single row) ────────────────────────────
create table if not exists payment_settings (
  id                  int primary key default 1,
  bank_name           text,
  bank_account_no     text,
  bank_account_holder text,
  qris_image_url      text,
  qris_provider       text,
  updated_at          timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- ── Audit log ────────────────────────────────────────────────
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  username   text,
  role       text,
  action     text not null,
  entity     text,
  entity_id  text,
  detail     text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_students_class       on students(class_id);
create index if not exists idx_students_status       on students(status);
create index if not exists idx_bills_student         on bills(student_id);
create index if not exists idx_bills_status          on bills(status);
create index if not exists idx_bills_period          on bills(period_year, period_month);
create index if not exists idx_payments_student      on payments(student_id);
create index if not exists idx_payments_paid_at      on payments(paid_at);
create index if not exists idx_audit_created         on audit_logs(created_at);
