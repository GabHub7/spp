-- ============================================================
-- 006_branding.sql — White-label branding settings
--   Lets each deployment (one school = one Supabase project/domain,
--   sharing only this codebase) configure its own identity without
--   touching source code: school name, app name, school level,
--   logo/favicon, and theme colors.
-- ============================================================

create table if not exists school_settings (
  id              int primary key default 1,
  school_name     text not null default 'SMK Poncol Jakarta',
  app_name        text not null default 'SIP-SPP',
  school_level    text not null default 'SMK',   -- SD | SMP | SMA | SMK | LAINNYA
  logo_url        text,
  favicon_url     text,
  primary_color   text not null default '#d11f2d',
  secondary_color text not null default '#f47a1f',
  updated_at      timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into school_settings (id) values (1) on conflict (id) do nothing;

-- Same model as the rest of the schema: all reads happen server-side via the
-- service-role client (see src/lib/school.ts), RLS just denies direct anon access.
alter table school_settings enable row level security;
drop policy if exists school_settings_select_auth on school_settings;
create policy school_settings_select_auth on school_settings for select to authenticated using (true);
