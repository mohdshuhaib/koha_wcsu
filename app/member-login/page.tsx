'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import Link from 'next/link'
import {
  Barcode,
  LogIn,
  AlertCircle,
  ArrowLeft,
  Library,
  Loader2,
} from 'lucide-react'

export default function MemberLogin() {
  const [barcode, setBarcode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const role = session.user.user_metadata?.role || 'member'
        router.replace(role === 'librarian' ? '/dashboard' : '/member/dashboard-mem')
      } else {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const paddedPassword = barcode.padEnd(6, '0')
    const email = `${barcode.toLowerCase()}@member.wcsu`

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: paddedPassword,
    })

    if (loginError) {
      setError('Invalid barcode. Please try again.')
      setLoading(false)
    } else {
      router.push('/member/dashboard-mem')
    }
  }

  if (checkingSession) return <Loading />

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[8%] h-56 w-56 rounded-full bg-dark-green/15 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute right-[-10%] top-[12%] h-56 w-56 rounded-full bg-button-yellow/20 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute bottom-[8%] left-[20%] h-56 w-56 rounded-full bg-light-green/15 blur-3xl sm:h-72 sm:w-72" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="hidden rounded-[2rem] border border-black/5 bg-white/40 p-8 shadow-xl backdrop-blur-md lg:block">
            <div className="max-w-md space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
                <Library size={16} className="text-dark-green" />
                Member Access
              </div>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-extrabold leading-tight text-heading-text-black">
                  Access your member library dashboard using your barcode
                </h1>
                <p className="text-base leading-7 text-text-grey">
                  Members can quickly sign in to check their dashboard, track library activity, and stay connected with the system.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Simple member login
                  </p>
                  <p className="mt-1 text-sm text-text-grey">
                    Just enter your library barcode to continue.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Fast access
                  </p>
                  <p className="mt-1 text-sm text-text-grey">
                    Sign in and go directly to your member dashboard.
                  </p>
                </div>
              </div>

              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary-dark-grey bg-white/80 px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-white hover:shadow-md"
              >
                <ArrowLeft size={18} />
                Back to Homepage
              </Link>
            </div>
          </div>

          <div className="w-full">
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 p-5 shadow-2xl backdrop-blur-md sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6 lg:hidden">
                <Link
                  href="/"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary-dark-grey bg-white px-3 py-2 text-sm font-medium text-heading-text-black transition hover:bg-primary-grey"
                >
                  <ArrowLeft size={16} />
                  Home
                </Link>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sub-heading-text-grey">
                    Campus Library
                  </p>
                </div>
              </div>

              <div className="space-y-5 sm:space-y-6">
                <div className="text-center">
                  <h1 className="font-heading text-2xl font-bold tracking-wide text-heading-text-black sm:text-3xl">
                    Member Login
                  </h1>
                  <p className="mt-1 text-sm text-sub-heading-text-grey sm:text-base">
                    Access your library dashboard.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span className="font-medium leading-6">{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="barcode"
                      className="mb-1.5 block text-sm font-semibold text-text-grey"
                    >
                      Library Barcode
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Barcode className="h-5 w-5 text-text-grey" />
                      </div>
                      <input
                        id="barcode"
                        type="text"
                        placeholder="Enter your barcode"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        disabled={loading}
                        required
                        className="h-12 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-4 text-sm text-heading-text-black placeholder:text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-button-yellow px-4 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Logging In...
                      </>
                    ) : (
                      <>
                        <LogIn size={18} />
                        Login
                      </>
                    )}
                  </button>

                  <Link
                    href="/"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary-dark-grey bg-white text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey lg:hidden"
                  >
                    <ArrowLeft size={18} />
                    Back to Homepage
                  </Link>
                </form>
              </div>

              <div className="mt-6 border-t border-primary-dark-grey pt-6 text-center">
                <p className="text-sm text-text-grey">
                  Are you a librarian?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-link-text-green transition hover:underline"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}