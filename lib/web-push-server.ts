import webPush, { PushSubscription } from 'web-push'

const publicKey =
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_FCM_VAPID_KEY

if (publicKey && process.env.WEB_PUSH_VAPID_PRIVATE_KEY && process.env.WEB_PUSH_CONTACT) {
  webPush.setVapidDetails(
    process.env.WEB_PUSH_CONTACT,
    publicKey,
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  )
}

export async function sendWebPushNotification({
  subscription,
  title,
  body,
  data = {},
}: {
  subscription: PushSubscription
  title: string
  body: string
  data?: Record<string, string>
}) {
  return webPush.sendNotification(
    subscription,
    JSON.stringify({
      title,
      body,
      icon: '/web-app-manifest-192x192.png',
      data,
    })
  )
}
