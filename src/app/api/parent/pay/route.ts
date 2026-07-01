import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-guard'
import { generateTransactionNo } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(req: Request) {
  const ctx = await getSession()
  if (!ctx || ctx.user.role !== 'ORANG_TUA') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { serviceClient, user } = ctx

  const form = await req.formData()
  const studentId = String(form.get('studentId') ?? '')
  const method = String(form.get('method') ?? '')
  const note = String(form.get('note') ?? '')
  const billIds = String(form.get('billIds') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const proof = form.get('proof')

  if (!['TRANSFER', 'QRIS'].includes(method)) {
    return NextResponse.json({ error: 'Metode pembayaran tidak valid.' }, { status: 400 })
  }
  if (billIds.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal satu tagihan.' }, { status: 400 })
  }
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json({ error: 'Bukti pembayaran wajib diunggah.' }, { status: 400 })
  }
  if (proof.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5 MB.' }, { status: 400 })
  }
  if (!ALLOWED.includes(proof.type)) {
    return NextResponse.json({ error: 'Format file harus JPG, PNG, WEBP, atau PDF.' }, { status: 400 })
  }

  // Ensure the student belongs to this parent.
  const { data: student } = await serviceClient
    .from('students')
    .select('id, full_name, parent_user_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student || student.parent_user_id !== user.id) {
    return NextResponse.json({ error: 'Siswa tidak terhubung dengan akun Anda.' }, { status: 403 })
  }

  // Validate bills.
  const { data: bills } = await serviceClient
    .from('bills')
    .select('id, student_id, amount, paid_amount, status, is_locked')
    .in('id', billIds)
  const valid = (bills ?? []) as { id: string; student_id: string; amount: number; paid_amount: number; status: string; is_locked: boolean }[]
  if (valid.length === 0) return NextResponse.json({ error: 'Tagihan tidak ditemukan.' }, { status: 404 })
  if (valid.some((b) => b.student_id !== studentId)) {
    return NextResponse.json({ error: 'Tagihan tidak sesuai siswa.' }, { status: 400 })
  }
  if (valid.some((b) => b.status === 'PAID')) {
    return NextResponse.json({ error: 'Sebagian tagihan sudah lunas.' }, { status: 409 })
  }
  if (valid.some((b) => b.is_locked)) {
    return NextResponse.json({ error: 'Sebagian tagihan terkunci.' }, { status: 409 })
  }

  // Upload proof.
  const ext = proof.type === 'application/pdf' ? 'pdf' : proof.type.split('/')[1] ?? 'jpg'
  const path = `proofs/${studentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await proof.arrayBuffer())
  const { error: upErr } = await serviceClient.storage
    .from('uploads')
    .upload(path, buffer, { contentType: proof.type, upsert: false })
  if (upErr) {
    return NextResponse.json({ error: `Gagal mengunggah bukti: ${upErr.message}` }, { status: 500 })
  }
  const { data: pub } = serviceClient.storage.from('uploads').getPublicUrl(path)
  const proofUrl = pub.publicUrl

  // Seed today's running sequence.
  const startToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString()
  const { count } = await serviceClient
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startToday)
  let seq = (count ?? 0) + 1

  let created = 0
  for (const bill of valid) {
    const remaining = Math.max(Number(bill.amount) - Number(bill.paid_amount), 0)
    if (remaining <= 0) continue
    let ok = false
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      const txn = generateTransactionNo(seq)
      const { error } = await serviceClient.from('payments').insert({
        transaction_no: txn,
        bill_id: bill.id,
        student_id: studentId,
        amount: remaining,
        method,
        status: 'PENDING',
        proof_url: proofUrl,
        note: note || null,
      })
      seq++
      if (!error) ok = true
      else if (error.message.includes('uniq_pending_payment')) {
        return NextResponse.json({ error: 'Sebagian tagihan sudah memiliki pembayaran menunggu verifikasi.' }, { status: 409 })
      } else if (!error.message.includes('duplicate')) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    if (ok) created++
  }

  await logAudit(serviceClient, user, {
    action: 'SUBMIT_PAYMENT',
    entity: 'payment',
    detail: `Orang tua mengajukan ${created} pembayaran (${method}) untuk ${student.full_name}`,
  })

  return NextResponse.json({ ok: true, count: created })
}
