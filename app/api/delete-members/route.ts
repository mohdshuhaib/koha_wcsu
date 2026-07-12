import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

async function requireStaff(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Unauthorized', status: 401 as const }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return { error: 'Unauthorized', status: 401 as const }

  const role = data.user.user_metadata?.role
  if (role !== 'librarian' && role !== 'admin') {
    return { error: 'Only library staff can delete patrons.', status: 403 as const }
  }

  return { user: data.user }
}

async function deleteAuthUser(memberId: string, barcode: string) {
  const directDelete = await supabaseAdmin.auth.admin.deleteUser(memberId)
  if (!directDelete.error) return true

  const email = `${barcode.toLowerCase()}@member.wcsu`
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return false

  const user = data.users.find((item) => item.email?.toLowerCase() === email)
  if (!user) return false

  const { error: fallbackDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  return !fallbackDeleteError
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((id: unknown) => String(id)).filter(Boolean)
    : []

  if (memberIds.length === 0) {
    return NextResponse.json({ error: 'No patrons were selected.' }, { status: 400 })
  }

  const { data: members, error: membersError } = await supabaseAdmin
    .from('members')
    .select('id, barcode')
    .in('id', memberIds)

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 400 })
  if (!members?.length) return NextResponse.json({ error: 'No matching patrons were found.' }, { status: 404 })

  const existingMemberIds = members.map((member) => member.id)

  const { data: activeBorrowRows } = await supabaseAdmin
    .from('borrow_records')
    .select('book_id')
    .in('member_id', existingMemberIds)
    .is('return_date', null)

  const activeBorrowBookIds = Array.from(new Set((activeBorrowRows || []).map((row) => row.book_id).filter(Boolean)))

  const { data: activeHoldRows } = await supabaseAdmin
    .from('hold_records')
    .select('book_id')
    .in('member_id', existingMemberIds)
    .eq('released', false)

  const activeHoldBookIds = Array.from(new Set((activeHoldRows || []).map((row) => row.book_id).filter(Boolean)))

  const { data: borrowRows, error: borrowError } = await supabaseAdmin
    .from('borrow_records')
    .select('id')
    .in('member_id', existingMemberIds)

  if (borrowError) return NextResponse.json({ error: borrowError.message }, { status: 400 })

  const borrowIds = (borrowRows || []).map((row) => row.id)
  if (borrowIds.length > 0) {
    const { error } = await supabaseAdmin.from('fine_payments').delete().in('borrow_record_id', borrowIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabaseAdmin.from('member_push_subscriptions').delete().in('member_id', existingMemberIds)
  await supabaseAdmin.from('hold_records').delete().in('member_id', existingMemberIds)
  await supabaseAdmin.from('borrow_records').delete().in('member_id', existingMemberIds)

  const booksToRelease = Array.from(new Set([...activeBorrowBookIds, ...activeHoldBookIds]))
  if (booksToRelease.length > 0) {
    const { error } = await supabaseAdmin.from('books').update({ status: 'available' }).in('id', booksToRelease)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { error: deleteMembersError } = await supabaseAdmin.from('members').delete().in('id', existingMemberIds)
  if (deleteMembersError) {
    return NextResponse.json({ error: deleteMembersError.message }, { status: 400 })
  }

  let authFailures = 0
  for (const member of members) {
    const deleted = await deleteAuthUser(member.id, member.barcode)
    if (!deleted) authFailures += 1
  }

  return NextResponse.json({
    success: true,
    deletedCount: existingMemberIds.length,
    releasedBookCount: booksToRelease.length,
    authFailures,
  })
}

