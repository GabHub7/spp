/** Small hex-color helpers used to derive hover/light theme shades from a single admin-picked color. */

function normalizeHex(input: string): string {
  const s = input.trim().replace('#', '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) return s.split('').map((c) => c + c).join('')
  if (/^[0-9a-fA-F]{6}$/.test(s)) return s
  return 'd11f2d'
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex)
  const num = parseInt(h, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Accepts "#rrggbb" or "rgb(r, g, b)" and normalizes to "#rrggbb". Falls back to the given default on invalid input. */
export function parseColorToHex(input: string, fallback = '#d11f2d'): string {
  const s = input.trim()
  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) return rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]))
  if (/^#?[0-9a-fA-F]{3}$/.test(s) || /^#?[0-9a-fA-F]{6}$/.test(s)) return `#${normalizeHex(s)}`
  return fallback
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Shifts a color towards white (percent > 0) or black (percent < 0), 0..1 range. */
export function shade(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex)
  const t = percent < 0 ? 0 : 255
  const p = Math.min(1, Math.abs(percent))
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p)
}
