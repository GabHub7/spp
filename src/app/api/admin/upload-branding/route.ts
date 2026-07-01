import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']

export async function POST(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'manageUsers')) {
    return NextResponse.json({ error: 'Hanya admin yang diizinkan.' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const kind = String(form.get('kind') ?? '')
  if (!['logo', 'favicon'].includes(kind)) {
    return NextResponse.json({ error: 'Jenis unggahan tidak valid.' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran gambar maksimal 2 MB.' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Format gambar harus JPG, PNG, WEBP, SVG, atau ICO.' }, { status: 400 })
  }

  const { serviceClient } = ctx
  const ext = file.type.split('/')[1]?.replace('x-icon', 'ico').replace('vnd.microsoft.icon', 'ico').replace('svg+xml', 'svg') ?? 'png'
  const path = `branding/${kind}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await serviceClient.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (upErr) {
    return NextResponse.json({ error: `Gagal mengunggah: ${upErr.message}` }, { status: 500 })
  }
  const { data: pub } = serviceClient.storage.from('uploads').getPublicUrl(path)

  const column = kind === 'logo' ? 'logo_url' : 'favicon_url'
  const { error: dbErr } = await serviceClient.from('school_settings').upsert({ id: 1, [column]: pub.publicUrl, updated_at: new Date().toISOString() })
  if (dbErr) {
    return NextResponse.json({ error: `Gambar terunggah tapi gagal disimpan: ${dbErr.message}` }, { status: 500 })
  }

  await logAudit(serviceClient, ctx.user, { action: 'UPDATE', entity: 'school_settings', detail: `Unggah ${kind === 'logo' ? 'logo' : 'favicon'} sekolah` })
  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
