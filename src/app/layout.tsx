import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { getSchoolSettingsSafe } from '@/lib/school'
import { rgba, shade } from '@/lib/color'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSchoolSettingsSafe()
  return {
    title: {
      template: `%s · ${settings.app_name}`,
      default: `${settings.app_name} — Sistem Informasi Pembayaran SPP`,
    },
    description: `Sistem Informasi Pembayaran SPP (${settings.app_name}) ${settings.school_name} — kelola data siswa, tagihan, pembayaran, tunggakan, dan laporan keuangan SPP secara digital.`,
    applicationName: settings.app_name,
    authors: [{ name: settings.school_name }],
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://poncolpay.vercel.app'),
    icons: {
      icon: settings.favicon_url || '/favicon.ico',
      shortcut: settings.favicon_url || '/favicon.ico',
      apple: settings.logo_url || '/icon.png',
    },
    robots: { index: false, follow: false },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#151316' },
    { media: '(prefers-color-scheme: light)', color: '#f6f3f1' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSchoolSettingsSafe()
  const { primary_color: p, secondary_color: s } = settings
  const themeOverrideCss = `:root{--accent:${p};--accent-hover:${shade(p, -0.15)};--accent-light:${rgba(p, 0.09)};--accent-2:${s};--accent-2-hover:${shade(s, -0.15)};--accent-2-light:${rgba(s, 0.12)};}[data-theme="dark"]{--accent:${shade(p, 0.12)};--accent-hover:${shade(p, 0.28)};--accent-light:${rgba(p, 0.16)};--accent-2:${shade(s, 0.12)};--accent-2-hover:${shade(s, 0.28)};--accent-2-light:${rgba(s, 0.16)};}`

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('poncolpay-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: themeOverrideCss }} />
      </head>
      <body className={`${jakarta.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
