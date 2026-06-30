import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { dueTomorrowMessage } from '@/lib/notification-messages'
import { sendNotificationToMember } from '@/lib/notifications-server'

dayjs.extend(utc)
dayjs.extend(timezone)

const IST = 'Asia/Kolkata'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendDueTomorrowNotifications(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tomorrow = dayjs().tz(IST).add(1, 'day').format('YYYY-MM-DD')

  const { data: records, error } = await supabaseAdmin
    .from('borrow_records')
    .select('id, member_id, due_date, books!inner(title, author)')
    .is('return_date', null)
    .gte('due_date', tomorrow)
    .lt('due_date', dayjs(tomorrow).add(1, 'day').format('YYYY-MM-DD'))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const record of records ?? []) {
    const book = Array.isArray(record.books) ? record.books[0] : record.books
    const result = await sendNotificationToMember({
      memberId: record.member_id,
      title: 'Book due tomorrow',
      body: dueTomorrowMessage({
        bookTitle: book?.title || 'your book',
        authorName: book?.author,
      }),
      data: {
        type: 'due_tomorrow',
        borrowRecordId: String(record.id),
      },
    })

    sent += result.sent
    failed += result.failed
  }

  return NextResponse.json({
    success: true,
    dueDate: tomorrow,
    records: records?.length ?? 0,
    sent,
    failed,
  })
}

export async function GET(req: NextRequest) {
  return sendDueTomorrowNotifications(req)
}

export async function POST(req: NextRequest) {
  return sendDueTomorrowNotifications(req)
}
