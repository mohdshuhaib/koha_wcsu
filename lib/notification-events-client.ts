'use client'

import { supabase } from '@/lib/supabase'

export async function sendLibraryNotification(event: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return

  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(event),
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}
