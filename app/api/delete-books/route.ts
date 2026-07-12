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
    return { error: 'Only library staff can delete books.', status: 403 as const }
  }

  return { user: data.user }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const bookIds = Array.isArray(body.bookIds)
    ? body.bookIds.map((id: unknown) => String(id)).filter(Boolean)
    : []

  if (bookIds.length === 0) {
    return NextResponse.json({ error: 'No books were selected.' }, { status: 400 })
  }

  const { data: existingBooks, error: booksError } = await supabaseAdmin
    .from('books')
    .select('id')
    .in('id', bookIds)

  if (booksError) return NextResponse.json({ error: booksError.message }, { status: 400 })
  const existingBookIds = (existingBooks || []).map((book) => book.id)
  if (existingBookIds.length === 0) {
    return NextResponse.json({ error: 'No matching books were found.' }, { status: 404 })
  }

  const { data: borrowRows, error: borrowError } = await supabaseAdmin
    .from('borrow_records')
    .select('id')
    .in('book_id', existingBookIds)

  if (borrowError) return NextResponse.json({ error: borrowError.message }, { status: 400 })

  const borrowIds = (borrowRows || []).map((row) => row.id)
  if (borrowIds.length > 0) {
    const { error } = await supabaseAdmin.from('fine_payments').delete().in('borrow_record_id', borrowIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabaseAdmin.from('hold_records').delete().in('book_id', existingBookIds)
  await supabaseAdmin.from('borrow_records').delete().in('book_id', existingBookIds)
  await supabaseAdmin.from('book_reviews').delete().in('book_id', existingBookIds)

  const { error: deleteBooksError } = await supabaseAdmin.from('books').delete().in('id', existingBookIds)
  if (deleteBooksError) {
    return NextResponse.json({ error: deleteBooksError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    deletedCount: existingBookIds.length,
  })
}
