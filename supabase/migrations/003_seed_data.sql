-- ============================================================
-- 003_seed_data.sql — roles, majors, active year, rate, settings
-- The first admin account is created via POST /api/setup/init
-- (needs the Supabase service role + auth user creation).
-- ============================================================

insert into roles (name, label) values
  ('ADMIN',          'Admin'),
  ('BENDAHARA',      'Bendahara'),
  ('KEPALA_SEKOLAH', 'Kepala Sekolah')
on conflict (name) do nothing;

insert into majors (code, name) values
  ('RPL',   'Rekayasa Perangkat Lunak'),
  ('TKJ',   'Teknik Komputer dan Jaringan'),
  ('DKV',   'Desain Komunikasi Visual'),
  ('BDP',   'Bisnis Daring dan Pemasaran'),
  ('AKL',   'Akuntansi dan Keuangan Lembaga'),
  ('TKR1',  'Teknik Kendaraan Ringan 1'),
  ('TKR2',  'Teknik Kendaraan Ringan 2')
on conflict (code) do nothing;

insert into academic_years (name, is_active) values
  ('2026/2027', true)
on conflict (name) do nothing;

-- Default SPP rate for the active year
insert into spp_rates (academic_year_id, amount, note)
select id, 150000, 'Tarif awal'
from academic_years where name = '2026/2027'
on conflict do nothing;

-- Sample classes
insert into classes (name, grade, major_id)
select c.name, c.grade, m.id
from (values
  ('X RPL 1','X','RPL'), ('XI RPL 1','XI','RPL'), ('XII RPL 1','XII','RPL'),
  ('X TKJ 1','X','TKJ'), ('XI TKJ 1','XI','TKJ'),
  ('X AKL 1','X','AKL')
) as c(name, grade, code)
join majors m on m.code = c.code
on conflict (name) do nothing;

insert into payment_settings (id, bank_name, bank_account_no, bank_account_holder)
values (1, 'Bank BRI', '0000-01-000000-50-0', 'SMK Poncol Jakarta')
on conflict (id) do nothing;
