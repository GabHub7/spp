// Shared (client + server) branding types/constants — kept separate from
// lib/school.ts because that file is server-only (DB access).

export interface SchoolSettings {
  school_name: string
  app_name: string
  school_level: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  school_name: 'SMK Poncol Jakarta',
  app_name: 'PoncolPay',
  school_level: 'SMK',
  logo_url: null,
  favicon_url: null,
  primary_color: '#d11f2d',
  secondary_color: '#f47a1f',
}

export const SCHOOL_LEVEL_LABEL: Record<string, string> = {
  SD: 'SD / Sederajat',
  SMP: 'SMP / Sederajat',
  SMA: 'SMA / Sederajat',
  SMK: 'SMK / Sederajat',
  LAINNYA: 'Lainnya',
}
