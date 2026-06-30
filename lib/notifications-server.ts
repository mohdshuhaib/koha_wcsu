import { createClient } from '@supabase/supabase-js'
import { PushSubscription } from 'web-push'
import { sendWebPushNotification } from '@/lib/web-push-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendNotificationToMember({
  memberId,
  title,
  body,
  data = {},
}: {
  memberId: string
  title: string
  body: string
  data?: Record<string, string>
}) {
  const { data: tokenRows, error } = await supabaseAdmin
    .from('member_push_subscriptions')
    .select('id, subscription')
    .eq('member_id', memberId)
    .eq('enabled', true)

  if (error) {
    throw new Error(error.message)
  }

  const subscriptions = tokenRows ?? []
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  const expiredSubscriptionIds: string[] = []

  for (const row of subscriptions) {
    try {
      await sendWebPushNotification({
        subscription: row.subscription as PushSubscription,
        title,
        body,
        data,
      })
      sent += 1
    } catch (error: any) {
      failed += 1
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        expiredSubscriptionIds.push(row.id)
      }
    }
  }

  if (expiredSubscriptionIds.length > 0) {
    await supabaseAdmin
      .from('member_push_subscriptions')
      .update({ enabled: false })
      .in('id', expiredSubscriptionIds)
  }

  return {
    sent,
    failed,
  }
}
