// app/api/bulk-create-members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, User } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type IncomingMember = {
  name?: string
  category?: string
  barcode?: string
  batch?: string
  ph_no?: string | null
  address?: string | null
  dob?: string | null
  email?: string | null
  class?: string | null
  image_link?: string | null
}

type NormalizedMember = {
  name: string
  category: string
  barcode: string
  batch: string
  authEmail: string
  password: string
  ph_no: string | null
  address: string | null
  dob: string | null
  email: string | null
  class: string | null
  image_link: string | null
}

type NormalizeResult =
  | { member: NormalizedMember; error?: never }
  | { member?: never; error: string }

const validCategories = new Set(['student', 'teacher', 'class', 'outside'])

function normalizeText(value: unknown) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function normalizeRow(member: IncomingMember, rowNumber: number): NormalizeResult {
  const barcode = String(member.barcode || '').trim().toUpperCase()
  const name = String(member.name || '').trim()
  const rawCategory = String(member.category || '').trim().toLowerCase()
  const category = rawCategory === 'outsider' ? 'outside' : rawCategory
  const batch = String(member.batch || '').trim()
  const dob = normalizeText(member.dob)

  if (!name || !category || !barcode || !batch) {
    return {
      error: `Row ${rowNumber}: name, category, barcode, and batch are required.`,
    }
  }

  if (!validCategories.has(category)) {
    return {
      error: `Row ${rowNumber} (${barcode}): category must be student, teacher, class, or outside.`,
    }
  }

  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return {
      error: `Row ${rowNumber} (${barcode}): dob must be in YYYY-MM-DD format.`,
    }
  }

  return {
    member: {
      name,
      category,
      barcode,
      batch,
      authEmail: `${barcode.toLowerCase()}@member.wcsu`,
      password: barcode.padEnd(6, '0'),
      ph_no: normalizeText(member.ph_no),
      address: normalizeText(member.address),
      dob,
      email: normalizeText(member.email),
      class: normalizeText(member.class),
      image_link: normalizeText(member.image_link),
    } satisfies NormalizedMember,
  }
}

async function listAllAuthUsers() {
  const users: User[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    users.push(...data.users)
    if (data.users.length < perPage) break
    page += 1
  }

  return users
}

async function rollback(createdAuthIds: string[], createdMemberIds: string[]) {
  if (createdMemberIds.length > 0) {
    const { error } = await supabaseAdmin.from('members').delete().in('id', createdMemberIds)
    if (error) console.error('Bulk member rollback failed:', error.message)
  }

  for (const userId of createdAuthIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) console.error(`Bulk auth rollback failed for ${userId}:`, error.message)
  }
}

export async function POST(req: NextRequest) {
  const createdAuthIds: string[] = []
  const createdMemberIds: string[] = []

  try {
    const rawMembers = (await req.json()) as IncomingMember[]

    if (!Array.isArray(rawMembers) || rawMembers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No patron rows were received.' },
        { status: 400 }
      )
    }

    const normalizedRows: NormalizedMember[] = []
    const validationErrors: string[] = []
    const seenBarcodes = new Set<string>()

    rawMembers.forEach((member, index) => {
      const result = normalizeRow(member, index + 2)
      if (result.error) {
        validationErrors.push(result.error)
        return
      }

      const normalizedMember = result.member
      if (!normalizedMember) return

      if (seenBarcodes.has(normalizedMember.barcode)) {
        validationErrors.push(`Row ${index + 2} (${normalizedMember.barcode}): duplicate barcode in this file.`)
        return
      }

      seenBarcodes.add(normalizedMember.barcode)
      normalizedRows.push(normalizedMember)
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(' ') },
        { status: 400 }
      )
    }

    const barcodes = normalizedRows.map((member) => member.barcode)
    const { data: existingMembers, error: existingMembersError } = await supabaseAdmin
      .from('members')
      .select('id, barcode')
      .in('barcode', barcodes)

    if (existingMembersError) {
      return NextResponse.json(
        { success: false, error: existingMembersError.message },
        { status: 500 }
      )
    }

    const existingMemberByBarcode = new Map(
      (existingMembers || []).map((member) => [member.barcode, member])
    )

    const authUsers = await listAllAuthUsers()
    const authByEmail = new Map(authUsers.map((user) => [user.email?.toLowerCase(), user]))
    let updatedMemberCount = 0

    for (const member of normalizedRows) {
      const existingMember = existingMemberByBarcode.get(member.barcode)
      const existingAuthUser = authByEmail.get(member.authEmail)
      let authUserId = existingMember?.id || existingAuthUser?.id
      let authCreatedInThisRequest = false

      if (existingAuthUser) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
          password: member.password,
          email_confirm: true,
          user_metadata: {
            ...existingAuthUser.user_metadata,
            role: 'member',
            barcode: member.barcode,
          },
        })

        if (updateAuthError) {
          await rollback(createdAuthIds, createdMemberIds)
          return NextResponse.json(
            { success: false, error: `Could not repair existing login for ${member.barcode}: ${updateAuthError.message}` },
            { status: 400 }
          )
        }
      } else {
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: member.authEmail,
          password: member.password,
          email_confirm: true,
          user_metadata: {
            role: 'member',
            barcode: member.barcode,
          },
        })

        if (userError) {
          await rollback(createdAuthIds, createdMemberIds)
          return NextResponse.json(
            { success: false, error: `Could not create login for ${member.barcode}: ${userError.message}` },
            { status: 400 }
          )
        }

        authUserId = user.user.id
        authCreatedInThisRequest = true
        createdAuthIds.push(user.user.id)
      }

      if (existingMember) {
        const { error: updateError } = await supabaseAdmin
          .from('members')
          .update({
            name: member.name,
            category: member.category,
            batch: member.batch,
            ph_no: member.ph_no,
            address: member.address,
            dob: member.dob,
            email: member.email,
            class: member.class,
            image_link: member.image_link,
          })
          .eq('barcode', member.barcode)

        if (updateError) {
          await rollback(createdAuthIds, createdMemberIds)
          return NextResponse.json(
            { success: false, error: `Members table update failed for ${member.barcode}: ${updateError.message}` },
            { status: 400 }
          )
        }

        updatedMemberCount += 1
        continue
      }

      if (!authUserId) {
        await rollback(createdAuthIds, createdMemberIds)
        return NextResponse.json(
          { success: false, error: `Could not resolve login account for ${member.barcode}.` },
          { status: 400 }
        )
      }

      const memberPayload = {
        id: authUserId,
        name: member.name,
        category: member.category,
        barcode: member.barcode,
        batch: member.batch,
        ph_no: member.ph_no,
        address: member.address,
        dob: member.dob,
        email: member.email,
        class: member.class,
        image_link: member.image_link,
      }

      const { error: insertError } = await supabaseAdmin.from('members').insert([memberPayload])

      if (insertError) {
        if (authCreatedInThisRequest && authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId)
          createdAuthIds.splice(createdAuthIds.indexOf(authUserId), 1)
        }

        await rollback(createdAuthIds, createdMemberIds)
        return NextResponse.json(
          { success: false, error: `Members table insert failed for ${member.barcode}: ${insertError.message}` },
          { status: 400 }
        )
      }

      createdMemberIds.push(authUserId)
    }

    return NextResponse.json({
      success: true,
      addedCount: normalizedRows.length,
      failed: [],
      repairedAuthCount: normalizedRows.filter((member) => authByEmail.has(member.authEmail)).length,
      updatedMemberCount,
    })
  } catch (err) {
    await rollback(createdAuthIds, createdMemberIds)
    console.error('Bulk creation error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
