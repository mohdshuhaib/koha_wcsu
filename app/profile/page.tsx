'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import { CheckCircle2, Lock, Save, UserCircle } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setDisplayName(user.user_metadata?.display_name || user.user_metadata?.name || '')
      setEmail(user.email || '')
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const updatePayload: {
      data: { display_name: string }
      password?: string
    } = {
      data: { display_name: displayName.trim() },
    }

    if (password) updatePayload.password = password

    const { error: updateError } = await supabase.auth.updateUser(updatePayload)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setPassword('')
    setConfirmPassword('')
    setMessage('Profile updated successfully.')
  }

  if (loading) return <Loading />

  return (
    <main className="min-h-screen bg-primary-grey px-4 pb-10 pt-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wider text-heading-text-black md:text-4xl">
            Profile
          </h1>
          <p className="mt-1 text-text-grey">Update your display name and account password.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-primary-dark-grey bg-secondary-white p-5 shadow-lg sm:p-7">
          <div className="space-y-5">
            {message && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-text-grey">Email</label>
              <input value={email} disabled className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey p-3 text-text-grey" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-text-grey">Display Name</label>
              <div className="relative">
                <UserCircle className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-grey" />
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-10 pr-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-text-grey">New Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-grey" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-10 pr-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-grey">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey p-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-primary-dark-grey pt-5">
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-dark-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-icon-green disabled:opacity-70">
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
