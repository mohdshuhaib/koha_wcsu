// app/api/bulk-create-members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST be Service Role
)

export async function POST(req: NextRequest) {
  try {
    const members = await req.json()

    const addedMembers = []
    const errors = []

    for (const member of members) {
      const { name, category, barcode, batch } = member

      // Create auth user
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: `${barcode}@member.wcsu`,
        password: barcode.padEnd(6, '0'),
        email_confirm: true
      })

      if (userError) {
        console.error('Auth user creation error:', userError)
        errors.push({ barcode, error: userError.message })
        continue
      }

      // Insert into members table
      const { error: insertError } = await supabaseAdmin.from('members').insert([
        {
          name,
          category,
          barcode,
          batch
        }
      ])

      if (insertError) {
        console.error('Members table insert error:', insertError)
        errors.push({ barcode, error: insertError.message })
        continue
      }

      addedMembers.push(barcode)
    }

    return NextResponse.json({
      success: true,
      addedCount: addedMembers.length,
      failed: errors
    })
  } catch (err) {
    console.error('Bulk creation error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
