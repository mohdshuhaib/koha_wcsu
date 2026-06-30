import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const body = await req.json()
  const subscription = body.subscription

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Missing push subscription' }, { status: 400 })
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('id', user.id)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('member_push_subscriptions')
    .upsert(
      {
        member_id: member.id,
        endpoint: subscription.endpoint,
        subscription,
        enabled: true,
        user_agent: req.headers.get('user-agent'),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
