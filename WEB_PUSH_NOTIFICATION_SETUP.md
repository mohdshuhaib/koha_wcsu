# Web Push Notification Setup

This app uses the browser Web Push API with VAPID keys. It does not require Firebase.

## 1. Run the database setup

Run `notification_setup.sql` in the Supabase SQL editor. It creates `member_push_subscriptions`, where each member browser/device subscription is stored.

## 2. Add environment variables

Add these to `.env.local` and to the deployed hosting environment:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_CONTACT=mailto:wcsulibrary4@gmail.com
CRON_SECRET=
```

`NEXT_PUBLIC_FCM_VAPID_KEY` is also supported as a fallback public key name, but `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` is clearer for this non-Firebase setup.

## 3. Member flow

When a member logs in, the dashboard shows an Enable notifications button if browser notifications are not already enabled. After the member allows permission, the app stores the browser's push subscription for that member.

## 4. Automatic due-tomorrow reminder

The route `/api/notifications/due-tomorrow` sends reminders for books due tomorrow. It accepts both `GET` and `POST`.

For Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/notifications/due-tomorrow",
      "schedule": "30 3 * * *"
    }
  ]
}
```

Vercel Cron runs in UTC, so `30 3 * * *` is 9:00 AM IST.
