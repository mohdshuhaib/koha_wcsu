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

    const normalizedBarcode = String(barcode).trim().toUpperCase()
    const normalizedName = String(name).trim()
    const normalizedBatch = String(batch).trim()
    const normalizedCategory = String(category).trim().toLowerCase()
    const email = `${normalizedBarcode.toLowerCase()}@member.wcsu`
    const password = normalizedBarcode.padEnd(6, '0') // You could use a more secure password scheme

    const { data: existingMember, error: existingMemberError } = await supabase
      .from('members')
      .select('id')
      .eq('barcode', normalizedBarcode)
      .maybeSingle()

    if (existingMemberError) {
      console.error('Existing member lookup error:', existingMemberError.message)
      return NextResponse.json({ error: existingMemberError.message }, { status: 500 })
    }

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

    const memberPayload = {
      id: authUser.user.id,
      name: normalizedName,
      barcode: normalizedBarcode,
      category: normalizedCategory,
      batch: normalizedBatch,
      ph_no: body.ph_no || null,
      address: body.address || null,
      dob: body.dob || null,
      email: body.email || null,
      class: body.class || null,
      image_link: body.image_link || null,
    }

    // Step 2: Insert into `members` table, or repair an existing member row
    // that was created before login accounts were generated.
    const { error: dbError } = existingMember
      ? await supabase.from('members').update(memberPayload).eq('id', existingMember.id)
      : await supabase.from('members').insert([memberPayload])

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
