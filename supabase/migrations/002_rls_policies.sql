-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security. The application performs all privileged
-- reads/writes through the Supabase *service-role* client AFTER
-- verifying the session + role in code (see src/lib/auth-guard.ts),
-- so RLS here primarily denies direct anon/public access.
-- ============================================================

alter table roles            enable row level security;
alter table users            enable row level security;
alter table majors           enable row level security;
alter table academic_years   enable row level security;
alter table classes          enable row level security;
alter table spp_rates        enable row level security;
alter table students         enable row level security;
alter table bills            enable row level security;
alter table payments         enable row level security;
alter table period_locks     enable row level security;
alter table payment_settings enable row level security;
alter table audit_logs       enable row level security;

-- A logged-in user may read their own profile row (used by the
-- session-bound client in middleware / auth-guard).
drop policy if exists users_select_self on users;
create policy users_select_self on users
  for select using (auth.uid() = auth_id);

-- Authenticated members of staff may read reference + operational
-- data with the session client (defence-in-depth; the app mostly
-- uses the service client). No anon access is granted anywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'majors','academic_years','classes','spp_rates',
    'students','bills','payments','period_locks','payment_settings'
  ]
  loop
    execute format('drop policy if exists %I_select_auth on %I;', t, t);
    execute format(
      'create policy %I_select_auth on %I for select to authenticated using (true);',
      t, t
    );
  end loop;
end $$;
