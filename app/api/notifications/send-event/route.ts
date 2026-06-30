import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  checkinMessage,
  checkoutMessage,
  finePaymentMessage,
} from '@/lib/notification-messages'
import { sendNotificationToMember } from '@/lib/notifications-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type NotificationEvent =
  | {
      type: 'checkout'
      memberId: string
      bookTitle: string
      authorName?: string | null
      checkoutDate: string
      dueDate: string
    }
  | {
      type: 'checkin'
      memberId: string
      bookTitle: string
      authorName?: string | null
      checkinDate: string
    }
  | {
      type: 'fine_payment'
      memberId: string
      paidAmount: number
      totalFine: number
    }

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

  const event = (await req.json()) as NotificationEvent

  if (!event.memberId) {
    return NextResponse.json({ error: 'Missing member id' }, { status: 400 })
  }

  let title = 'Library Notification'
  let body = ''

  if (event.type === 'checkout') {
    title = 'Book checked out'
    body = checkoutMessage(event)
  }

  if (event.type === 'checkin') {
    title = 'Book returned'
    body = checkinMessage(event)
  }

  if (event.type === 'fine_payment') {
    title = 'Fine payment received'
    body = finePaymentMessage(event)
  }

  if (!body) {
    return NextResponse.json({ error: 'Unsupported notification type' }, { status: 400 })
  }

  const result = await sendNotificationToMember({
    memberId: event.memberId,
    title,
    body,
    data: { type: event.type },
  })

  return NextResponse.json({ success: true, ...result })
}
