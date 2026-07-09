'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Loading from '@/app/loading'
import Link from 'next/link'
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Library,
  Loader2,
} from 'lucide-react'
import clsx from 'classnames'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)

  const [view, setView] = useState<'login' | 'reset'>('login')

  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)


  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const role = session.user.user_metadata?.role || 'member'

        if (role === 'developer') {
          router.replace('/developer/dashboard-dev')
        } else if (role === 'librarian' || role === 'admin') {
          router.replace('/dashboard')
        } else {
          router.replace('/member/dashboard-mem')
        }
      } else {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoginLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoginLoading(false)
    } else {
      const role = data.user?.user_metadata?.role || 'member'

      if (role === 'developer') {
        router.push('/developer/dashboard-dev')
      } else if (role === 'librarian' || role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/member/dashboard-mem')
      }
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMsg(null)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${location.origin}/reset-password`,
    })

    if (error) {
      setResetMsg({ type: 'error', text: error.message })
    } else {
      setResetMsg({
        type: 'success',
        text: 'Password reset email sent. Check your inbox.',
      })
    }

    setResetLoading(false)
  }

  if (checkingSession) return <Loading />

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[8%] h-56 w-56 rounded-full bg-dark-green/15 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute right-[-10%] top-[12%] h-56 w-56 rounded-full bg-button-yellow/20 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute bottom-[8%] left-[20%] h-56 w-56 rounded-full bg-light-green/15 blur-3xl sm:h-72 sm:w-72" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Left side info panel */}
          <div className="hidden rounded-[2rem] border border-black/5 bg-white/40 p-8 shadow-soft backdrop-blur-md lg:block">
            <div className="max-w-md space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
                <Library size={16} className="text-dark-green" />
                Campus Library Access
              </div>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-extrabold leading-tight text-heading-text-black">
                  Admin access for librarian tools and dashboard management
                </h1>
                <p className="text-base leading-7 text-text-grey">
                  Sign in to manage books, members, check-ins, fines, backups,
                  and overall library operations in one place.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Secure login
                  </p>
                  <p className="mt-1 text-sm text-text-grey">
                    Access is role-based and redirects automatically to the
                    correct dashboard.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Password recovery
                  </p>
                  <p className="mt-1 text-sm text-text-grey">
                    Reset links are sent directly to your registered email.
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

          {/* Right side form */}
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

              {view === 'login' ? (
                <div className="space-y-5 sm:space-y-6">
                  <div className="text-center">
                    <h1 className="font-heading text-2xl font-bold tracking-wide text-heading-text-black sm:text-3xl">
                      Librarian Login
                    </h1>
                    <p className="mt-1 text-sm text-sub-heading-text-grey sm:text-base">
                      Welcome back! Please sign in to continue.
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
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-semibold text-text-grey"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-5 w-5 text-text-grey" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          required
                          disabled={loginLoading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="h-12 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-4 text-sm text-heading-text-black placeholder:text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green sm:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="mb-1.5 block text-sm font-semibold text-text-grey"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock className="h-5 w-5 text-text-grey" />
                        </div>
                        <input
                          id="password"
                          type="password"
                          required
                          disabled={loginLoading}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-12 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-4 text-sm text-heading-text-black placeholder:text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green sm:text-base"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email)
                          setResetMsg(null)
                          setView('reset')
                        }}
                        className="mt-2 inline-flex text-sm font-medium text-link-text-green transition hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-button-yellow px-4 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn size={18} />
                          Sign In
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
              ) : (
                <div className="space-y-5 sm:space-y-6">
                  <div className="text-center">
                    <h1 className="font-heading text-2xl font-bold tracking-wide text-heading-text-black sm:text-3xl">
                      Reset Password
                    </h1>
                    <p className="mt-1 text-sm text-sub-heading-text-grey sm:text-base">
                      Enter your email to receive a reset link.
                    </p>
                  </div>

                  {resetMsg && (
                    <div
                      className={clsx(
                        'flex items-start gap-3 rounded-2xl border p-4 text-sm',
                        resetMsg.type === 'error'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : 'border-green-200 bg-green-50 text-green-800'
                      )}
                    >
                      {resetMsg.type === 'error' ? (
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                      )}
                      <span className="font-medium leading-6">
                        {resetMsg.text}
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="reset-email"
                        className="mb-1.5 block text-sm font-semibold text-text-grey"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-5 w-5 text-text-grey" />
                        </div>
                        <input
                          id="reset-email"
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="h-12 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-4 text-sm text-heading-text-black placeholder:text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green sm:text-base"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-button-yellow px-4 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                    >
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResetMsg(null)
                        setView('login')
                      }}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-primary-dark-grey bg-white text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
                    >
                      Back to Login
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
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
