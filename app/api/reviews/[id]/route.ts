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
    return { error: 'Only the main librarian can manage reviews.', status: 403 as const }
  }

  return { user: data.user }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const payload: Record<string, string | number | boolean | null> = {}

  if ('reviewer_name' in body) {
    const reviewerName = String(body.reviewer_name || '').trim()
    if (!reviewerName) return NextResponse.json({ error: 'Reviewer name is required.' }, { status: 400 })
    payload.reviewer_name = reviewerName
  }

  if ('reviewer_role' in body) payload.reviewer_role = String(body.reviewer_role || '').trim() || null
  if ('comment' in body) payload.comment = String(body.comment || '').trim() || null

  if ('rating' in body) {
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }
    payload.rating = rating
  }

  if ('approved' in body) payload.approved = Boolean(body.approved)

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No review changes were provided.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('book_reviews').update(payload).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { error, count } = await supabaseAdmin
    .from('book_reviews')
    .delete({ count: 'exact' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!count) return NextResponse.json({ error: 'Review was not found.' }, { status: 404 })

  return NextResponse.json({ success: true })
}
