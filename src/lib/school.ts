import 'server-only'
import { cache } from 'react'
import { createServiceClient, type SupabaseServiceClient } from './supabase/server'
import { DEFAULT_SCHOOL_SETTINGS, type SchoolSettings } from './school-types'

export type { SchoolSettings } from './school-types'
export { DEFAULT_SCHOOL_SETTINGS, SCHOOL_LEVEL_LABEL } from './school-types'

/**
 * White-label identity for this deployment (school name, app name, logo,
 * favicon, theme colors). Each school runs its own Supabase project/domain
 * off the same codebase, so this is the single place that customizes it —
 * no source changes needed per school.
 */
export async function getSchoolSettings(service: SupabaseServiceClient): Promise<SchoolSettings> {
  const { data } = await service.from('school_settings').select('*').eq('id', 1).maybeSingle()
  if (!data) return DEFAULT_SCHOOL_SETTINGS
  const row = data as Partial<SchoolSettings>
  return {
    school_name: row.school_name || DEFAULT_SCHOOL_SETTINGS.school_name,
    app_name: row.app_name || DEFAULT_SCHOOL_SETTINGS.app_name,
    school_level: row.school_level || DEFAULT_SCHOOL_SETTINGS.school_level,
    logo_url: row.logo_url ?? null,
    favicon_url: row.favicon_url ?? null,
    primary_color: row.primary_color || DEFAULT_SCHOOL_SETTINGS.primary_color,
    secondary_color: row.secondary_color || DEFAULT_SCHOOL_SETTINGS.secondary_color,
  }
}

/**
 * Same as getSchoolSettings, but creates its own service client and never
 * throws — falls back to defaults on missing env vars / network issues.
 * Wrapped in React's cache() so the several layouts nested on any given
 * request (root → (app)/(auth)/portal) share a single DB round-trip instead
 * of each re-querying the same singleton row.
 */
export const getSchoolSettingsSafe = cache(async (): Promise<SchoolSettings> => {
  try {
    return await getSchoolSettings(createServiceClient())
  } catch (err) {
    console.error('[school] falling back to default branding:', err)
    return DEFAULT_SCHOOL_SETTINGS
  }
})
