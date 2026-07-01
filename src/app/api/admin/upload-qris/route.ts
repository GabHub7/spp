import { NextResponse } from 'next/server'
import { getSession, can } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: Request) {
  const ctx = await getSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.user.role, 'manageUsers')) {
    return NextResponse.json({ error: 'Hanya admin yang diizinkan.' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran gambar maksimal 5 MB.' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WEBP.' }, { status: 400 })
  }

  const { serviceClient } = ctx
  const ext = file.type.split('/')[1] ?? 'png'
  const path = `qris/qris-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await serviceClient.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (upErr) {
    return NextResponse.json({ error: `Gagal mengunggah: ${upErr.message}` }, { status: 500 })
  }
  const { data: pub } = serviceClient.storage.from('uploads').getPublicUrl(path)

  await serviceClient.from('payment_settings').upsert({
    id: 1,
    qris_image_url: pub.publicUrl,
    updated_at: new Date().toISOString(),
  })

  await logAudit(serviceClient, ctx.user, { action: 'UPDATE', entity: 'payment_settings', detail: 'Unggah gambar QRIS' })
  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
