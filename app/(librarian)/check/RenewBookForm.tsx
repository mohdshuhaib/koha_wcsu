'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffUser, StaffUser } from '@/lib/staff-user'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {
  Barcode,
  CheckCircle2,
  AlertCircle,
  Camera,
  Clock3,
  RefreshCcw,
  BookOpen,
  User,
  ShieldAlert,
  CalendarDays,
  ScanLine,
  X,
} from 'lucide-react'
import clsx from 'classnames'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const IST = 'Asia/Kolkata'

function toIST(value?: string | Date | dayjs.Dayjs | null) {
  if (!value) return dayjs().tz(IST)
  return dayjs(value).tz(IST)
}

function formatIST(value: string | Date | dayjs.Dayjs, format = 'DD MMM YYYY') {
  return toIST(value).format(format)
}

type PreviewData = {
  title: string
  dueDate: string
  renewalStartDate: string
  memberName: string
  memberCategory: string
  hasBlockingHold: boolean
  statusLabel: 'eligible' | 'too_early' | 'overdue' | 'blocked_hold'
}

export default function RenewBookForm() {
  const [bookBarcode, setBookBarcode] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [previewData, setPreviewData] = useState<PreviewData | null>(null)

  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.matchMedia('(pointer: coarse)').matches
    )
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    void getCurrentStaffUser().then(setStaffUser)
  }, [])

  const clearMessage = () => {
    setMessage('')
    setIsError(false)
  }

  const resetAll = (clearFeedback = true) => {
    setBookBarcode('')
    setPreviewData(null)
    setLoading(false)

    if (clearFeedback) {
      setMessage('')
      setIsError(false)
    }

    setTimeout(() => inputRef.current?.focus(), 150)
  }

  const resetAfterSuccess = () => {
    setBookBarcode('')
    setPreviewData(null)
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  const handleRenew = async () => {
    if (!bookBarcode.trim()) return

    setLoading(true)
    clearMessage()
    setPreviewData(null)

    const barcode = bookBarcode.trim()

    // Step 1: Fetch book by barcode
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, status')
      .eq('barcode', barcode)
      .single()

    if (bookError || !book) {
      setMessage('Book not found. Please check the barcode and try again.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    // Step 2: Check if the book is actually borrowed
    if (book.status !== 'borrowed') {
      setMessage(`This book ("${book.title}") is not currently checked out.`)
      setIsError(true)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    // Step 3: Fetch active borrow record + member
    const { data: borrowRecord, error: recordError } = await supabase
      .from('borrow_records')
      .select(`
        id,
        due_date,
        member_id,
        member:member_id(name, category)
      `)
      .eq('book_id', book.id)
      .is('return_date', null)
      .order('borrow_date', { ascending: false })
      .limit(1)
      .single()

    if (recordError || !borrowRecord) {
      setMessage('An active borrow record could not be found for this book.')
      setIsError(true)
      setLoading(false)
      return
    }

    const member = Array.isArray(borrowRecord.member)
      ? borrowRecord.member[0]
      : borrowRecord.member

    if (!member) {
      setMessage('Could not find the member associated with this loan.')
      setIsError(true)
      setLoading(false)
      return
    }

    // Step 4: Prepare timing preview in IST
    const today = dayjs().tz(IST).startOf('day')
    const dueDate = toIST(borrowRecord.due_date).startOf('day')
    const daysUntilDue = dueDate.diff(today, 'day')
    const renewalStartDate = dueDate.subtract(5, 'day')

    // Step 5: Check for blocking holds
    const { count: blockingHoldCount, error: holdCountError } = await supabase
      .from('hold_records')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', book.id)
      .eq('released', false)
      .neq('member_id', borrowRecord.member_id)

    if (holdCountError) {
      setMessage('Unable to verify hold status for this book. Please try again.')
      setIsError(true)
      setLoading(false)
      return
    }

    const hasBlockingHold = !!blockingHoldCount && blockingHoldCount > 0

    let statusLabel: PreviewData['statusLabel'] = 'eligible'

    if (today.isAfter(dueDate, 'day')) {
      statusLabel = 'overdue'
    } else if (daysUntilDue > 5) {
      statusLabel = 'too_early'
    } else if (hasBlockingHold) {
      statusLabel = 'blocked_hold'
    }

    setPreviewData({
      title: book.title,
      dueDate: dueDate.toISOString(),
      renewalStartDate: renewalStartDate.toISOString(),
      memberName: member.name,
      memberCategory: member.category,
      hasBlockingHold,
      statusLabel,
    })

    // Step 6: Validate before renewal
    if (today.isAfter(dueDate, 'day')) {
      setMessage('This book is overdue. It must be checked in before it can be renewed.')
      setIsError(true)
      setLoading(false)
      return
    }

    if (daysUntilDue > 5) {
      setMessage(
        `It's too early to renew. This book can be renewed on or after ${renewalStartDate.format('DD MMM YYYY')}.`
      )
      setIsError(true)
      setLoading(false)
      return
    }

    if (hasBlockingHold) {
      setMessage('This book has an active hold for another member and cannot be renewed.')
      setIsError(true)
      setLoading(false)
      return
    }

    // Step 7: Final renewal through RPC
    const { data: renewedRows, error: renewError } = await supabase.rpc('renew_book', {
      p_book_id: book.id,
    })

    if (renewError) {
      const msg = renewError.message || 'Failed to renew the book. Please try again.'

      if (msg === 'It is too early to renew this book') {
        setMessage(
          `It's too early to renew. This book can be renewed on or after ${renewalStartDate.format('DD MMM YYYY')}.`
        )
      } else {
        setMessage(msg)
      }

      setIsError(true)
      setLoading(false)
      return
    }

    const renewed = Array.isArray(renewedRows) ? renewedRows[0] : renewedRows

    if (!renewed) {
      setMessage('Renewal completed, but no updated details were returned.')
      setIsError(false)
      setLoading(false)
      return
    }

    if (staffUser) {
      await supabase
        .from('borrow_records')
        .update({
          renewal_by_id: staffUser.id,
          renewal_by_name: staffUser.displayName,
        })
        .eq('id', borrowRecord.id)
    }

    setMessage(
      `"${renewed.book_title}" renewed for ${renewed.member_name}. New due date: ${formatIST(
        renewed.new_due_date,
        'DD MMM YYYY'
      )}`
    )
    setIsError(false)
    resetAfterSuccess()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenew()
    }
  }

  const getStatusUI = () => {
    if (!previewData) return null

    switch (previewData.statusLabel) {
      case 'eligible':
        return {
          label: 'Eligible for Renewal',
          className: 'bg-green-100 text-green-700',
        }
      case 'too_early':
        return {
          label: 'Too Early',
          className: 'bg-amber-100 text-amber-700',
        }
      case 'overdue':
        return {
          label: 'Overdue',
          className: 'bg-red-100 text-red-700',
        }
      case 'blocked_hold':
        return {
          label: 'Blocked by Hold',
          className: 'bg-red-100 text-red-700',
        }
      default:
        return null
    }
  }

  const statusUI = getStatusUI()

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-primary-dark-grey bg-white shadow-sm">
          <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-heading-text-black sm:text-xl">
              Renew a Borrowed Book
            </h2>
            <p className="mt-1 text-sm text-text-grey">
              Renewal is allowed only within the last 5 days before the due date, and not when another member has an active hold.
            </p>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
            {/* Input section */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-semibold text-heading-text-black">
                  Book Barcode
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Barcode className="h-5 w-5 text-text-grey" />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-14 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                    placeholder="Scan or enter book barcode to renew"
                    value={bookBarcode}
                    onChange={(e) => {
                      clearMessage()
                      setBookBarcode(e.target.value)
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    {bookBarcode && !loading && (
                      <button
                        type="button"
                        onClick={() => resetAll()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-red-500"
                        aria-label="Clear barcode"
                      >
                        <X size={18} />
                      </button>
                    )}

                    {isMobileDevice && !loading && (
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-dark-green"
                        aria-label="Scan book barcode"
                      >
                        <Camera size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:items-end">
                <button
                  type="button"
                  onClick={() => resetAll()}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey sm:w-auto"
                  disabled={loading}
                >
                  Reset
                </button>

                <button
                  onClick={handleRenew}
                  disabled={loading || !bookBarcode.trim()}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-button-yellow px-6 py-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? 'Renewing...' : 'Renew Book'}
                </button>
              </div>
            </div>

            {/* Workflow tip */}
            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/30 p-4">
              <div className="flex items-start gap-3">
                <ScanLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-dark-green" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Staff Workflow Tip
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-grey">
                    Scan the barcode and review the renewal status before processing. Validation details stay visible if the renewal cannot be completed.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview */}
            {previewData && (
              <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/20 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-heading-text-black">
                      Renewal Preview
                    </h3>
                    <p className="mt-1 text-sm text-text-grey">
                      Review the loan details before final renewal.
                    </p>
                  </div>

                  {statusUI && (
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        statusUI.className
                      )}
                    >
                      {statusUI.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-primary-dark-grey bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                      <BookOpen size={14} />
                      Book
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-heading-text-black sm:text-base">
                      {previewData.title}
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary-dark-grey bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                      <CalendarDays size={14} />
                      Due Date
                    </div>
                    <p className="mt-2 text-sm font-semibold text-heading-text-black sm:text-base">
                      {formatIST(previewData.dueDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary-dark-grey bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                      <Clock3 size={14} />
                      Renewal Opens
                    </div>
                    <p className="mt-2 text-sm font-semibold text-heading-text-black sm:text-base">
                      {formatIST(previewData.renewalStartDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary-dark-grey bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                      <User size={14} />
                      Member
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-heading-text-black sm:text-base">
                      {previewData.memberName}
                    </p>
                    <p className="mt-1 text-xs capitalize text-text-grey">
                      {previewData.memberCategory}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-primary-dark-grey bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-text-grey">
                      Renewal Rule
                    </p>
                    <p className="mt-2 text-sm leading-6 text-heading-text-black">
                      Renewal is permitted only during the last 5 days before the due date.
                    </p>
                  </div>

                  <div
                    className={clsx(
                      'rounded-xl border p-4',
                      previewData.hasBlockingHold
                        ? 'border-red-200 bg-red-50'
                        : 'border-green-200 bg-green-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert
                        className={clsx(
                          'mt-0.5 h-4 w-4 flex-shrink-0',
                          previewData.hasBlockingHold ? 'text-red-600' : 'text-green-600'
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={clsx(
                            'text-sm font-semibold',
                            previewData.hasBlockingHold
                              ? 'text-red-800'
                              : 'text-green-800'
                          )}
                        >
                          {previewData.hasBlockingHold
                            ? 'Active hold found'
                            : 'No blocking hold'}
                        </p>
                        <p
                          className={clsx(
                            'mt-1 text-sm leading-6',
                            previewData.hasBlockingHold
                              ? 'text-red-700'
                              : 'text-green-700'
                          )}
                        >
                          {previewData.hasBlockingHold
                            ? 'Another member is waiting for this book, so renewal is not allowed.'
                            : 'No other member is waiting for this book.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div
                className={clsx(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                  isError
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-green-200 bg-green-50 text-green-800'
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <p className="break-words font-medium leading-6">{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan Book Barcode"
        onScanSuccess={(value) => {
          clearMessage()
          setBookBarcode(value)
        }}
      />
    </>
  )
}
