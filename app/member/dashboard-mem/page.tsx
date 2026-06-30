'use client'

import { useEffect, useMemo, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import NotificationSettings from '@/components/NotificationSettings'
import dayjs from 'dayjs'
import {
  BookOpen,
  IndianRupee,
  LogOut,
  Book,
  Clock,
  Check,
  AlertTriangle,
  Calendar,
  Library,
  UserCircle2,
  ArrowRight,
  BadgeCheck,
  Receipt,
} from 'lucide-react'
import clsx from 'classnames'

// --- Type Definitions ---
type Record = {
  return_date: string | null
  fine: number
  fine_paid: boolean
  borrow_date: string
  due_date: string
  books: {
    title: string
  } | null
}

type MemberData = {
  name: string
  booksRead: number
  pendingFines: number
  currentlyBorrowed: Record[]
  returnedHistory: Record[]
}

// --- Main Page Component ---
export default function MemberDashboard() {
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/member-login')
        return
      }

      const barcode = user.email?.split('@')[0] || ''
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, name')
        .eq('barcode', barcode.toUpperCase())
        .single()

      if (memberError || !memberData) {
        setError('Could not find your member profile.')
        setLoading(false)
        return
      }

      const { data: records } = await supabase
        .from('borrow_records')
        .select('*, books(title)')
        .eq('member_id', memberData.id)
        .order('borrow_date', { ascending: false })

      const returnedHistory = records?.filter((r) => r.return_date !== null) || []
      const currentlyBorrowed = records?.filter((r) => r.return_date === null) || []
      const pendingFines = currentlyBorrowed.reduce(
        (acc, r) => acc + (r.fine_paid ? 0 : r.fine || 0),
        0
      )

      setMember({
        name: memberData.name,
        booksRead: returnedHistory.length,
        pendingFines,
        currentlyBorrowed,
        returnedHistory,
      })
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const overdueCount = useMemo(() => {
    if (!member) return 0
    return member.currentlyBorrowed.filter(
      (record) => !record.return_date && dayjs().isAfter(dayjs(record.due_date), 'day')
    ).length
  }, [member])

  const currentBorrowCount = member?.currentlyBorrowed.length || 0

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="min-h-screen bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-heading-text-black">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-text-grey sm:text-base">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!member) return null

  return (
    <div className="min-h-screen bg-primary-grey px-4 pb-10 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header / Welcome */}
        <section className="overflow-hidden rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 shadow-2xl backdrop-blur-sm">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.3fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-primary-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
                <Library size={16} className="text-dark-green" />
                Member Dashboard
              </div>

              <div>
                <h1 className="font-heading text-3xl font-bold text-heading-text-black sm:text-4xl">
                  Welcome, {member.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-grey sm:text-base">
                  Here is your personal library overview including your borrowed
                  books, reading history, overdue items, and pending fines.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Books Read"
                  value={member.booksRead}
                  icon={<BookOpen size={18} className="text-blue-600" />}
                  tone="blue"
                />
                <StatCard
                  label="Currently Borrowed"
                  value={currentBorrowCount}
                  icon={<Book size={18} className="text-emerald-600" />}
                  tone="green"
                />
                <StatCard
                  label="Overdue Books"
                  value={overdueCount}
                  icon={<AlertTriangle size={18} className="text-amber-600" />}
                  tone="yellow"
                />
                <StatCard
                  label="Pending Fines"
                  value={`₹${member.pendingFines}`}
                  icon={<IndianRupee size={18} className="text-red-600" />}
                  tone="red"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <NotificationSettings />

              <div className="rounded-[1.5rem] border border-primary-dark-grey bg-primary-grey/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-dark-green shadow-sm">
                    <UserCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-heading-text-black">
                      Member Summary
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-grey">
                      Keep track of due dates and fines to avoid overdue issues
                      and enjoy a smoother library experience.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <QuickInfoRow
                    icon={<BadgeCheck size={16} />}
                    label="Returned books"
                    value={String(member.returnedHistory.length)}
                  />
                  <QuickInfoRow
                    icon={<Clock size={16} />}
                    label="Due attention"
                    value={
                      overdueCount > 0 ? `${overdueCount} overdue` : 'All clear'
                    }
                  />
                  <QuickInfoRow
                    icon={<Receipt size={16} />}
                    label="Fine status"
                    value={
                      member.pendingFines > 0
                        ? `₹${member.pendingFines} unpaid`
                        : 'No unpaid fines'
                    }
                  />
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <DashboardPanel
            title="Currently Borrowed"
            subtitle="Books that are still with you"
            accent="blue"
          >
            <HistoryList
              records={member.currentlyBorrowed}
              isBorrowedList
            />
          </DashboardPanel>

          <DashboardPanel
            title="Returned History"
            subtitle="Your completed borrowing records"
            accent="green"
          >
            <HistoryList
              records={member.returnedHistory}
              isBorrowedList={false}
            />
          </DashboardPanel>
        </div>
      </div>
    </div>
  )
}

// --- Helper Components ---
function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: number | string
  icon: ReactNode
  tone?: 'default' | 'blue' | 'green' | 'yellow' | 'red'
}) {
  const toneClasses = {
    default: 'bg-primary-grey',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
  }

  return (
    <div className="rounded-2xl border border-primary-dark-grey bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-full',
            toneClasses[tone]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-grey">{label}</p>
          <p className="truncate text-2xl font-bold text-heading-text-black">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function QuickInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-dark-green">{icon}</div>
        <span className="truncate text-sm font-medium text-text-grey">
          {label}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-heading-text-black">
        {value}
      </span>
    </div>
  )
}

function DashboardPanel({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle: string
  accent: 'blue' | 'green'
  children: ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 p-5 shadow-xl sm:p-6">
      <div className="mb-5">
        <h2
          className={clsx(
            'text-2xl font-bold font-heading',
            accent === 'blue' ? 'text-blue-700' : 'text-green-700'
          )}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-grey">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function HistoryList({
  records,
  isBorrowedList,
}: {
  records: Record[]
  isBorrowedList: boolean
}) {
  return (
    <div className="space-y-4">
      {records.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-primary-dark-grey bg-primary-grey/60 px-4 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-text-grey shadow-sm">
              {isBorrowedList ? <BookOpen size={20} /> : <Check size={20} />}
            </div>
            <p className="mt-4 text-lg font-semibold text-heading-text-black">
              {isBorrowedList ? 'No borrowed books' : 'No returned books yet'}
            </p>
            <p className="mt-2 text-sm text-text-grey">
              {isBorrowedList
                ? 'You currently have no books checked out.'
                : "You haven't returned any books yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => {
            const isOverdue =
              !record.return_date &&
              dayjs().isAfter(dayjs(record.due_date), 'day')

            return (
              <article
                key={index}
                className="rounded-2xl border border-primary-dark-grey bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex font-malayalam items-start gap-2 text-base font-semibold text-heading-text-black">
                        <Book size={16} className="mt-0.5 shrink-0 text-dark-green" />
                        <span className="break-words">
                          {record.books?.title || 'Unknown Book'}
                        </span>
                      </h3>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <MetaPill
                          icon={<Calendar size={13} />}
                          label="Borrowed"
                          value={dayjs(record.borrow_date).format('DD MMM YYYY')}
                        />

                        {isBorrowedList ? (
                          <MetaPill
                            icon={<Clock size={13} />}
                            label="Due"
                            value={dayjs(record.due_date).format('DD MMM YYYY')}
                          />
                        ) : (
                          <MetaPill
                            icon={<Check size={13} />}
                            label="Returned"
                            value={dayjs(record.return_date).format('DD MMM YYYY')}
                          />
                        )}
                      </div>
                    </div>

                    {isBorrowedList && (
                      <div className="shrink-0">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                            <AlertTriangle size={12} />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                            <BadgeCheck size={12} />
                            On Time
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {record.fine > 0 && (
                    <div
                      className={clsx(
                        'flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm',
                        record.fine_paid
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <IndianRupee size={15} />
                        Fine: ₹{record.fine}
                      </div>
                      <div className="inline-flex items-center gap-1 font-medium">
                        {record.fine_paid ? (
                          <>
                            <Check size={14} />
                            Paid
                          </>
                        ) : (
                          <>
                            <ArrowRight size={14} />
                            Unpaid
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-primary-grey px-3 py-2 text-sm text-text-grey">
      <span className="text-dark-green">{icon}</span>
      <span>
        <strong className="text-heading-text-black">{label}:</strong> {value}
      </span>
    </div>
  )
}
