'use client'

export type ThemeName = 'light' | 'dark'

const STORAGE_KEY = 'poncolpay-theme'

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    return t === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: ThemeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}
