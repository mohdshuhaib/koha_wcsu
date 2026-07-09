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
    return { error: 'Only the main librarian can manage admins.', status: 403 as const }
  }

  return { user: data.user }
}

export async function GET(req: NextRequest) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admins = data.users
    .filter((user) => user.user_metadata?.role === 'admin')
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.display_name || user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
      created_at: user.created_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const name = String(body.name || '').trim()
  const phone = String(body.phone || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!name || !phone || !email || password.length < 6) {
    return NextResponse.json(
      { error: 'Name, phone, email, and a password with at least 6 characters are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      display_name: name,
      phone,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    admin: {
      id: data.user.id,
      email: data.user.email,
      name,
      phone,
      created_at: data.user.created_at,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireLibrarian(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const id = String(body.id || '')
  const name = String(body.name || '').trim()

  if (!id || !name) {
    return NextResponse.json({ error: 'Admin id and name are required.' }, { status: 400 })
  }

  const { data: existing, error: getError } = await supabaseAdmin.auth.admin.getUserById(id)
  if (getError || !existing.user) {
    return NextResponse.json({ error: getError?.message || 'Admin not found.' }, { status: 404 })
  }

  if (existing.user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin accounts can be edited here.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: {
      ...existing.user.user_metadata,
      display_name: name,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    admin: {
      id: data.user.id,
      email: data.user.email,
      name,
      phone: data.user.user_metadata?.phone || '',
      created_at: data.user.created_at,
    },
  })
}

