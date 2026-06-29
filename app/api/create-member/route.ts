// app/api/create-member/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, barcode, category, batch } = body

    if (!name || !barcode || !category || !batch) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const email = `${barcode}@member.wcsu`
    const password = barcode.padEnd(6, '0') // You could use a more secure password scheme

    // Step 1: Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Step 2: Insert into `members` table
    const { error: dbError } = await supabase.from('members').insert([
      {
        id: authUser.user.id,
        name,
        barcode,
        category,
        batch,
      }
    ])

    if (dbError) {
      console.error('DB error:', dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: authUser.user.id }, { status: 200 })
  } catch (err: any) {
    console.error('Server error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
