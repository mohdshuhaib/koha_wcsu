import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

async function requireLibrarian(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) return { error: 'Unauthorized', status: 401 as const }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return { error: 'Unauthorized', status: 401 as const }

  if (data.user.user_metadata?.role !== 'librarian') {
    return { error: 'Only the main librarian can delete admins.', status: 403 as const }
  }

  return { user: data.user }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = params

  const { data: existing, error: getError } = await supabaseAdmin.auth.admin.getUserById(id)
  if (getError || !existing.user) {
    return NextResponse.json({ error: getError?.message || 'Admin not found.' }, { status: 404 })
  }

  if (existing.user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin accounts can be deleted here.' }, { status: 400 })
  }

  await Promise.all([
    supabaseAdmin.from('borrow_records').update({ checkout_by_id: null, checkout_by_name: null }).eq('checkout_by_id', id),
    supabaseAdmin.from('borrow_records').update({ checkin_by_id: null, checkin_by_name: null }).eq('checkin_by_id', id),
    supabaseAdmin.from('borrow_records').update({ renewal_by_id: null, renewal_by_name: null }).eq('renewal_by_id', id),
    supabaseAdmin.from('hold_records').update({ hold_by_id: null, hold_by_name: null }).eq('hold_by_id', id),
    supabaseAdmin.from('periodical_records').update({ created_by_id: null, created_by_name: null }).eq('created_by_id', id),
    supabaseAdmin.from('periodical_records').update({ returned_by_id: null, returned_by_name: null }).eq('returned_by_id', id),
    supabaseAdmin.from('fine_payments').update({ librarian_id: null, librarian_name: null }).eq('librarian_id', id),
  ])

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
