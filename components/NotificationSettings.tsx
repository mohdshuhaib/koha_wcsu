'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { requestWebPushSubscription } from '@/lib/web-push-client'

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

  }, [])

  const enableNotifications = async () => {
    setLoading(true)
    setStatus('')

    try {
      const subscription = await requestWebPushSubscription()

      if (!subscription) {
        setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default')
        setStatus('Notifications were not enabled. Please allow notification permission in your browser.')
        setLoading(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscription }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to register this device.')
      }

      setPermission('granted')
      setStatus('Notifications are enabled for this device.')
    } catch (error: any) {
      setStatus(error.message || 'Failed to enable notifications.')
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'unsupported') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>This browser does not support push notifications.</span>
        </div>
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <div className="flex items-start gap-2">
          <BellRing size={16} className="mt-0.5 shrink-0" />
          <span>{status || 'Notifications are enabled for this browser.'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-primary-dark-grey bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-grey text-dark-green">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-heading-text-black">Enable notifications</p>
            <p className="mt-1 text-sm leading-5 text-text-grey">
              Get alerts for checkouts, returns, fine payments, and due-date reminders.
            </p>
            {status && <p className="mt-2 text-xs font-medium text-red-700">{status}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={enableNotifications}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-dark-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-icon-green disabled:opacity-60"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
      </div>
    </div>
  )
}
