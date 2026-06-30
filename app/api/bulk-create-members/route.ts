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
    const errors: { barcode: string; error: string }[] = []

    for (const member of members) {
      const { name, category, barcode, batch } = member
      const normalizedBarcode = String(barcode || '').trim().toUpperCase()
      const normalizedName = String(name || '').trim()
      const rawCategory = String(category || '').trim().toLowerCase()
      const normalizedCategory = rawCategory === 'outsider' ? 'outside' : rawCategory
      const normalizedBatch = String(batch || '').trim()

      if (!normalizedName || !normalizedCategory || !normalizedBarcode || !normalizedBatch) {
        errors.push({ barcode: normalizedBarcode || 'N/A', error: 'Missing required fields' })
        continue
      }

      const { data: existingMember, error: existingMemberError } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('barcode', normalizedBarcode)
        .maybeSingle()

      if (existingMemberError) {
        console.error('Existing member lookup error:', existingMemberError)
        errors.push({ barcode: normalizedBarcode, error: existingMemberError.message })
        continue
      }

      // Create auth user
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: `${normalizedBarcode.toLowerCase()}@member.wcsu`,
        password: normalizedBarcode.padEnd(6, '0'),
        email_confirm: true
      })

      if (userError) {
        console.error('Auth user creation error:', userError)
        errors.push({ barcode: normalizedBarcode, error: userError.message })
        continue
      }

      const memberPayload = {
        id: user.user.id,
        name: normalizedName,
        category: normalizedCategory,
        barcode: normalizedBarcode,
        batch: normalizedBatch
      }

      // Insert into members table, or repair a row that was previously created without Auth.
      const { error: insertError } = existingMember
        ? await supabaseAdmin.from('members').update(memberPayload).eq('id', existingMember.id)
        : await supabaseAdmin.from('members').insert([memberPayload])

      if (insertError) {
        console.error('Members table insert error:', insertError)
        errors.push({ barcode: normalizedBarcode, error: insertError.message })
        continue
      }

      addedMembers.push(normalizedBarcode)
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
