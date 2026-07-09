'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sendLibraryNotification } from '@/lib/notification-events-client'
import { getCurrentStaffUser, StaffUser } from '@/lib/staff-user'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { CustomDayPicker } from '@/components/CustomDayPicker'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import 'react-day-picker/dist/style.css'
import {
  Barcode,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Camera,
  RotateCcw,
  BookOpen,
  Clock3,
  IndianRupee,
  BookMarked,
  ShieldCheck,
  ScanLine,
  User,
  BookText,
  CheckCheck,
} from 'lucide-react'
import clsx from 'classnames'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const IST = 'Asia/Kolkata'

type HolidayRow = {
  leave_date: string
}

type ActiveReturnRecord = {
  id: string
  borrow_date: string
  due_date: string | null
  member: {
    id: string
    name: string
    barcode: string
    category: 'student' | 'teacher' | 'outside' | 'class'
  }
  book: {
    id: string
    title: string
    author: string | null
    barcode: string
    pages: number | null
  }
  savedHolidays: HolidayRow[]
  isOverdue: boolean
  overdueDaysBeforePersonal: number
}

function toIST(value?: string | Date | dayjs.Dayjs | null) {
  if (!value) return dayjs().tz(IST)
  return dayjs(value).tz(IST)
}

function parseISTDateKey(dateKey: string) {
  return dayjs.tz(dateKey, 'YYYY-MM-DD', IST)
}

function toISTDateKey(value: string | Date | dayjs.Dayjs) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISTDateKey(value).format('YYYY-MM-DD')
  }
  return toIST(value).format('YYYY-MM-DD')
}

function formatIST(value: string | Date | dayjs.Dayjs, format = 'DD MMM YYYY') {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISTDateKey(value).format(format)
  }
  return toIST(value).format(format)
}

function getAllowedDays(category?: string | null) {
  if (category === 'student') return 14
  if (category === 'teacher' || category === 'outside' || category === 'class') return 30
  return 14
}

function isFineEligibleCategory(category?: string | null) {
  return category === 'student'
}

function getFallbackDueDateKey(borrowDate: string, category?: string | null) {
  const allowedDays = getAllowedDays(category)
  return toIST(borrowDate).startOf('day').add(allowedDays, 'day').format('YYYY-MM-DD')
}

function ModalShell({
  children,
  onClose,
  maxWidth = 'max-w-5xl',
}: {
  children: React.ReactNode
  onClose?: () => void
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          className={clsx(
            'w-full overflow-hidden rounded-2xl border border-primary-dark-grey bg-secondary-white shadow-2xl',
            maxWidth
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/40 p-4 sm:p-5">
      <div className="mb-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-heading-text-black">
          {title}
        </h4>
        {description && <p className="mt-1 text-sm leading-6 text-text-grey">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  subtext?: React.ReactNode
  tone?: 'default' | 'success' | 'danger'
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-4',
        tone === 'danger'
          ? 'border-red-200 bg-red-50'
          : tone === 'success'
            ? 'border-green-200 bg-green-50'
            : 'border-primary-dark-grey bg-white'
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-grey">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words font-malayalam text-lg sm:text-xl font-bold text-heading-text-black">
        {value}
      </div>
      {subtext && <div className="mt-2 text-xs sm:text-sm leading-5 text-text-grey">{subtext}</div>}
    </div>
  )
}

export default function CheckInForm() {
  const [barcode, setBarcode] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [activeRecord, setActiveRecord] = useState<ActiveReturnRecord | null>(null)
  const [manualHolidays, setManualHolidays] = useState<Date[]>([])

  const [pagesReadInput, setPagesReadInput] = useState('')
  const [isFullRead, setIsFullRead] = useState(false)
  const [totalPagesInput, setTotalPagesInput] = useState('')

  const [isGlobalLeaveModalOpen, setIsGlobalLeaveModalOpen] = useState(false)
  const [globalHolidays, setGlobalHolidays] = useState<Date[]>([])
  const [globalHolidaysLoading, setGlobalHolidaysLoading] = useState(false)
  const [isResetGlobalLeavesModalOpen, setIsResetGlobalLeavesModalOpen] = useState(false)

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

  useEffect(() => {
    if (!activeRecord) {
      setManualHolidays([])
      setPagesReadInput('')
      setIsFullRead(false)
      setTotalPagesInput('')
      return
    }

    setManualHolidays([])
    setPagesReadInput('')
    setIsFullRead(false)
    setTotalPagesInput(activeRecord.book.pages ? String(activeRecord.book.pages) : '')
  }, [activeRecord])

  const clearMessage = () => {
    setMessage('')
    setIsError(false)
  }

  const fetchGlobalHolidays = async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('leave_date')
      .order('leave_date', { ascending: true })

    if (error) {
      setMessage('Failed to load global leave days.')
      setIsError(true)
      return []
    }

    return data ?? []
  }

  const fetchAndSetGlobalHolidays = async () => {
    setGlobalHolidaysLoading(true)
    const data = await fetchGlobalHolidays()
    setGlobalHolidays(data.map((d) => parseISTDateKey(d.leave_date).toDate()))
    setGlobalHolidaysLoading(false)
  }

  const openGlobalLeaveModal = async () => {
    clearMessage()
    await fetchAndSetGlobalHolidays()
    setIsGlobalLeaveModalOpen(true)
  }

  const getOverdueWindowGlobalHolidays = async (dueDateKey: string, returnDateKey: string) => {
    if (parseISTDateKey(returnDateKey).isSameOrBefore(parseISTDateKey(dueDateKey), 'day')) {
      return []
    }

    const overdueStartKey = parseISTDateKey(dueDateKey).add(1, 'day').format('YYYY-MM-DD')

    const { data, error } = await supabase
      .from('holidays')
      .select('leave_date')
      .gte('leave_date', overdueStartKey)
      .lte('leave_date', returnDateKey)
      .order('leave_date', { ascending: true })

    if (error) return []

    return (data ?? []).filter((h) => {
      const hDay = parseISTDateKey(h.leave_date)
      return (
        hDay.isSameOrAfter(parseISTDateKey(overdueStartKey), 'day') &&
        hDay.isSameOrBefore(parseISTDateKey(returnDateKey), 'day')
      )
    })
  }

  const buildFineComputation = (
    recordToProcess: ActiveReturnRecord,
    savedHolidays: HolidayRow[],
    personalHolidays: Date[]
  ) => {
    const todayKey = dayjs().tz(IST).format('YYYY-MM-DD')
    const dueDateKey = recordToProcess.due_date
      ? toISTDateKey(recordToProcess.due_date)
      : getFallbackDueDateKey(recordToProcess.borrow_date, recordToProcess.member.category)

    const dueDay = parseISTDateKey(dueDateKey)
    const returnDay = parseISTDateKey(todayKey)

    if (returnDay.isSameOrBefore(dueDay, 'day')) {
      return {
        fine: 0,
        effectiveOverdueDays: 0,
        totalExcludedDays: 0,
        dueDateKey,
        returnDateKey: todayKey,
      }
    }

    const overdueDays = returnDay.diff(dueDay, 'day')
    const overdueStartKey = dueDay.add(1, 'day').format('YYYY-MM-DD')

    const globalDates = savedHolidays.map((d) => d.leave_date)
    const personalDates = personalHolidays
      .map((d) => toISTDateKey(d))
      .filter((key) => {
        const day = parseISTDateKey(key)
        return (
          day.isSameOrAfter(parseISTDateKey(overdueStartKey), 'day') &&
          day.isSameOrBefore(returnDay, 'day')
        )
      })

    const allUniqueExcludedDates = new Set([...globalDates, ...personalDates])
    const totalExcludedDays = allUniqueExcludedDates.size
    const effectiveOverdueDays = Math.max(overdueDays - totalExcludedDays, 0)

    const fine = isFineEligibleCategory(recordToProcess.member.category) ? effectiveOverdueDays : 0

    return {
      fine,
      effectiveOverdueDays,
      totalExcludedDays,
      dueDateKey,
      returnDateKey: todayKey,
    }
  }

  const getPagesReadPayload = () => {
    if (!activeRecord) {
      return {
        pagesRead: null as number | null,
        totalPagesToSave: null as number | null,
        error: 'No active record found.',
      }
    }

    const bookPages = activeRecord.book.pages

    if (isFullRead) {
      if (bookPages && bookPages > 0) {
        return {
          pagesRead: bookPages,
          totalPagesToSave: null,
          error: null,
        }
      }

      const totalPages = Number(totalPagesInput)
      if (!Number.isInteger(totalPages) || totalPages <= 0) {
        return {
          pagesRead: null,
          totalPagesToSave: null,
          error: 'Enter the total pages for this book to mark it as fully read.',
        }
      }

      return {
        pagesRead: totalPages,
        totalPagesToSave: totalPages,
        error: null,
      }
    }

    const pagesRead = Number(pagesReadInput)
    if (!Number.isInteger(pagesRead) || pagesRead < 0) {
      return {
        pagesRead: null,
        totalPagesToSave: null,
        error: 'Enter a valid number of pages read.',
      }
    }

    if (bookPages && pagesRead > bookPages) {
      return {
        pagesRead: null,
        totalPagesToSave: null,
        error: `Pages read cannot be more than total pages (${bookPages}).`,
      }
    }

    return {
      pagesRead,
      totalPagesToSave: null,
      error: null,
    }
  }

  const resetProcess = (clearBarcode = false) => {
    setActiveRecord(null)
    setManualHolidays([])
    setPagesReadInput('')
    setIsFullRead(false)
    setTotalPagesInput('')
    if (clearBarcode) setBarcode('')
    setLoading(false)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const fullReset = () => {
    resetProcess(true)
    setMessage('')
    setIsError(false)
  }

  const handleInitialScan = async () => {
    if (!barcode.trim()) return

    setLoading(true)
    clearMessage()

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, author, barcode, pages')
      .eq('barcode', barcode.trim())
      .single()

    if (bookError || !book) {
      setMessage('Book not found with that barcode.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    const { data: record, error: recordError } = await supabase
      .from('borrow_records')
      .select(`
        id,
        borrow_date,
        due_date,
        member:member_id(id, name, barcode, category)
      `)
      .eq('book_id', book.id)
      .is('return_date', null)
      .single()

    if (recordError || !record) {
      setMessage('This book is not currently checked out.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    const memberData = Array.isArray(record.member) ? record.member[0] : record.member
    const dueDateKey = record.due_date
      ? toISTDateKey(record.due_date)
      : getFallbackDueDateKey(record.borrow_date, memberData?.category)

    const todayKey = dayjs().tz(IST).format('YYYY-MM-DD')
    const overdueGlobalHolidays = await getOverdueWindowGlobalHolidays(dueDateKey, todayKey)

    const tempRecord: ActiveReturnRecord = {
      ...record,
      member: memberData,
      book,
      savedHolidays: overdueGlobalHolidays,
      isOverdue: false,
      overdueDaysBeforePersonal: 0,
    }

    const preview = buildFineComputation(tempRecord, overdueGlobalHolidays, [])
    const isOverdue =
      preview.effectiveOverdueDays > 0 ||
      parseISTDateKey(todayKey).isAfter(parseISTDateKey(dueDateKey), 'day')

    setActiveRecord({
      ...tempRecord,
      isOverdue,
      overdueDaysBeforePersonal: preview.effectiveOverdueDays,
    })

    setMessage(
      isOverdue
        ? 'This return is overdue based on the due date. Review leave days and reading details before check-in.'
        : `Review reading details and confirm check-in for "${book.title}".`
    )
    setIsError(false)
    setLoading(false)
  }

  const handleConfirmCheckIn = async () => {
    if (!activeRecord) return

    const pagesPayload = getPagesReadPayload()
    if (pagesPayload.error || pagesPayload.pagesRead === null) {
      setMessage(pagesPayload.error || 'Pages read is required.')
      setIsError(true)
      return
    }

    const computation = buildFineComputation(
      activeRecord,
      activeRecord.savedHolidays,
      manualHolidays
    )

    setLoading(true)
    setMessage('Processing return...')
    setIsError(false)

    const returnDateISO = dayjs().tz(IST).toISOString()

    const { error } = await supabase.rpc('checkin_book', {
      p_borrow_record_id: activeRecord.id,
      p_book_id: activeRecord.book.id,
      p_return_date: returnDateISO,
      p_fine: computation.fine,
      p_pages_read: pagesPayload.pagesRead,
      p_total_pages: pagesPayload.totalPagesToSave,
    })

    if (error) {
      setMessage(error.message || 'The check-in process failed. Please try again.')
      setIsError(true)
      setLoading(false)
      return
    }

    if (staffUser) {
      await supabase
        .from('borrow_records')
        .update({
          checkin_by_id: staffUser.id,
          checkin_by_name: staffUser.displayName,
        })
        .eq('id', activeRecord.id)
    }

    let successMessage = `Returned "${activeRecord.book.title}" by ${activeRecord.member.name}.`
    if (pagesPayload.pagesRead >= 0) successMessage += ` Pages read: ${pagesPayload.pagesRead}.`
    if (computation.fine > 0) successMessage += ` Fine: ₹${computation.fine}.`
    if (computation.totalExcludedDays > 0) {
      successMessage += ` (${computation.totalExcludedDays} leave day(s) excluded from overdue count.)`
    }

    setMessage(successMessage)
    void sendLibraryNotification({
      type: 'checkin',
      memberId: activeRecord.member.id,
      bookTitle: activeRecord.book.title,
      authorName: activeRecord.book.author,
      checkinDate: returnDateISO,
    })
    setIsError(false)
    resetProcess(true)
  }

  const handleSaveGlobalHolidays = async () => {
    setGlobalHolidaysLoading(true)
    clearMessage()

    const selectedDateKeys = Array.from(new Set(globalHolidays.map((d) => toISTDateKey(d)))).sort()

    const existingRows = await fetchGlobalHolidays()
    const existingDateKeys = existingRows.map((row) => row.leave_date)

    const toInsert = selectedDateKeys.filter((d) => !existingDateKeys.includes(d))
    const toDelete = existingDateKeys.filter((d) => !selectedDateKeys.includes(d))

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('holidays')
        .delete()
        .in('leave_date', toDelete)

      if (deleteError) {
        setMessage('Failed to remove some global leave days.')
        setIsError(true)
        setGlobalHolidaysLoading(false)
        return
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('holidays')
        .insert(toInsert.map((leave_date) => ({ leave_date })))

      if (insertError) {
        setMessage('Failed to save some global leave days. Please check for duplicates.')
        setIsError(true)
        setGlobalHolidaysLoading(false)
        return
      }
    }

    setMessage(
      toInsert.length === 0 && toDelete.length === 0
        ? 'No changes were made to global leave days.'
        : 'Global leave days have been updated successfully.'
    )
    setIsError(false)
    setGlobalHolidaysLoading(false)
    setIsGlobalLeaveModalOpen(false)
  }

  const handleResetGlobalHolidays = async () => {
    setGlobalHolidaysLoading(true)
    clearMessage()

    const existingRows = await fetchGlobalHolidays()
    const existingDateKeys = existingRows.map((row) => row.leave_date)

    if (existingDateKeys.length > 0) {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .in('leave_date', existingDateKeys)

      if (error) {
        setMessage('Failed to clear global leave days.')
        setIsError(true)
        setGlobalHolidaysLoading(false)
        return
      }
    }

    setGlobalHolidays([])
    setIsResetGlobalLeavesModalOpen(false)
    setIsGlobalLeaveModalOpen(false)
    setGlobalHolidaysLoading(false)
    setMessage('All global leave days have been cleared.')
    setIsError(false)
  }

  const globalDatesForReturnModal =
    activeRecord?.savedHolidays.map((h) => parseISTDateKey(h.leave_date).toDate()) ?? []

  const sortedGlobalHolidayDateKeys = Array.from(
    new Set(globalHolidays.map((d) => toISTDateKey(d)))
  ).sort()

  const computedPreview = activeRecord
    ? buildFineComputation(activeRecord, activeRecord.savedHolidays, manualHolidays)
    : null

  const dueDateLabel = activeRecord
    ? activeRecord.due_date
      ? toISTDateKey(activeRecord.due_date)
      : getFallbackDueDateKey(activeRecord.borrow_date, activeRecord.member.category)
    : null

  return (
    <>
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-primary-dark-grey bg-white shadow-sm">
          <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-heading-text-black">
                  Check In a Book
                </h2>
                <p className="mt-1 text-sm text-text-grey">
                  Scan a borrowed book, review overdue calculations, leave adjustments, and reading
                  progress, then confirm the check-in.
                </p>
              </div>

              <button
                onClick={openGlobalLeaveModal}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-primary-dark-grey bg-white px-4 py-2.5 text-sm font-semibold text-dark-green transition hover:bg-primary-grey"
              >
                <CalendarDays size={16} />
                Manage Global Leaves
              </button>
            </div>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
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
                    className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-20 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                    placeholder="Scan or enter book barcode to return"
                    value={barcode}
                    onChange={(e) => {
                      clearMessage()
                      setBarcode(e.target.value)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleInitialScan()}
                    disabled={!!activeRecord || loading}
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    {barcode && !loading && !activeRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          setBarcode('')
                          clearMessage()
                          inputRef.current?.focus()
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-red-500"
                        aria-label="Clear barcode"
                      >
                        <X size={18} />
                      </button>
                    )}

                    {isMobileDevice && !loading && !activeRecord && (
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
                  onClick={fullReset}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey sm:w-auto"
                  disabled={loading}
                >
                  Reset
                </button>

                <button
                  onClick={handleInitialScan}
                  disabled={loading || !!activeRecord || !barcode.trim()}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-button-yellow px-6 py-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? 'Scanning...' : 'Scan Book'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/30 p-4">
              <div className="flex items-start gap-3">
                <ScanLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-dark-green" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Staff Workflow Tip
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-grey">
                    After scanning, the return review panel opens so you can verify fines, excluded
                    leave days, and reading progress before final check-in.
                  </p>
                </div>
              </div>
            </div>

            {message && !activeRecord && (
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

      {activeRecord && (
        <ModalShell onClose={fullReset} maxWidth="max-w-6xl">
          <div className="flex max-h-[94vh] flex-col">
            <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-heading-text-black">
                    Confirm Book Return
                  </h3>
                  <p className="mt-1 text-sm text-text-grey">
                    Review the return details, leave adjustments, and reading progress.
                  </p>
                </div>

                <button
                  onClick={fullReset}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-text-grey transition hover:bg-primary-dark-grey hover:text-red-500"
                  aria-label="Close return modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={<BookMarked size={14} />}
                    label="Book"
                    value={activeRecord.book.title}
                    subtext={
                      <span className="break-all text-xs text-text-grey">
                        {activeRecord.book.barcode}
                      </span>
                    }
                  />

                  <StatCard
                    icon={<User size={14} />}
                    label="Member"
                    value={activeRecord.member.name}
                    subtext={
                      <span className="break-all text-xs text-text-grey capitalize">
                        {activeRecord.member.barcode} • {activeRecord.member.category}
                      </span>
                    }
                  />

                  <StatCard
                    icon={<Clock3 size={14} />}
                    label="Borrowed On"
                    value={formatIST(activeRecord.borrow_date)}
                  />

                  <StatCard
                    icon={<CalendarDays size={14} />}
                    label="Due Date"
                    value={dueDateLabel ? formatIST(dueDateLabel) : '-'}
                  />
                </div>

                {computedPreview && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard
                      icon={<Clock3 size={14} />}
                      label="Overdue Days"
                      value={computedPreview.effectiveOverdueDays}
                      tone={computedPreview.effectiveOverdueDays > 0 ? 'danger' : 'success'}
                      subtext={
                        computedPreview.effectiveOverdueDays > 0
                          ? 'Effective overdue after excluded days.'
                          : 'No overdue days after exclusions.'
                      }
                    />

                    <StatCard
                      icon={<CalendarDays size={14} />}
                      label="Excluded Leave Days"
                      value={computedPreview.totalExcludedDays}
                      subtext="Global and personal leave days excluded from overdue calculation."
                    />

                    <StatCard
                      icon={<IndianRupee size={14} />}
                      label="Fine"
                      value={`₹${computedPreview.fine}`}
                      tone={computedPreview.fine > 0 ? 'danger' : 'success'}
                      subtext={
                        computedPreview.fine > 0
                          ? 'Fine will be saved during check-in.'
                          : 'No fine will be charged.'
                      }
                    />
                  </div>
                )}

                {activeRecord.isOverdue && (
                  <SectionCard
                    title="Personal Leave Days"
                    description="Select any additional personal leave days that should be excluded from overdue fine calculation. Global leave days are already locked and highlighted."
                  >
                    <div className="rounded-xl border border-primary-dark-grey bg-white p-3 sm:p-4">
                      <div className="overflow-x-auto">
                        <div className="flex min-w-[320px] justify-center">
                          <CustomDayPicker
                            mode="multiple"
                            selected={manualHolidays}
                            onSelect={(days) => setManualHolidays(days || [])}
                            fromDate={toIST(activeRecord.borrow_date).toDate()}
                            toDate={dayjs().tz(IST).toDate()}
                            disabled={globalDatesForReturnModal}
                            modifiers={{ globalHoliday: globalDatesForReturnModal }}
                            modifiersClassNames={{
                              globalHoliday:
                                'bg-red-100 text-red-700 font-bold hover:bg-red-100 cursor-not-allowed',
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border border-red-200 bg-red-100" />
                          Global Leave
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border border-yellow-500 bg-button-yellow" />
                          Personal Leave
                        </div>
                      </div>

                      <p className="mt-4 text-center text-sm font-medium text-text-grey">
                        Selected personal leave days: {manualHolidays.length}
                      </p>
                    </div>
                  </SectionCard>
                )}

                <SectionCard
                  title="Reading Progress"
                  description="Record how many pages the member read before returning the book."
                >
                  <div className="space-y-4">
                    <label className="inline-flex items-start gap-3 rounded-xl border border-primary-dark-grey bg-white px-4 py-3 text-sm font-medium text-heading-text-black">
                      <input
                        type="checkbox"
                        checked={isFullRead}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setIsFullRead(checked)
                          if (checked && activeRecord.book.pages) {
                            setPagesReadInput(String(activeRecord.book.pages))
                          }
                        }}
                        className="mt-0.5 accent-green-700"
                      />
                      <div>
                        <p className="font-semibold text-heading-text-black">Full read</p>
                        <p className="mt-1 text-sm text-text-grey">
                          Mark this if the member completed the entire book.
                        </p>
                      </div>
                    </label>

                    {isFullRead ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {activeRecord.book.pages ? (
                          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                            <p className="text-sm text-text-grey">Total book pages</p>
                            <p className="mt-1 text-2xl font-bold text-heading-text-black">
                              {activeRecord.book.pages}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-text-grey">
                              Pages read will be saved as {activeRecord.book.pages}.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-2xl border border-primary-dark-grey bg-white p-4">
                            <label className="text-sm font-semibold text-heading-text-black">
                              Enter total pages of this book
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={totalPagesInput}
                              onChange={(e) => setTotalPagesInput(e.target.value)}
                              className="w-full rounded-xl border border-primary-dark-grey bg-secondary-white p-3 text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                              placeholder="Enter total pages"
                            />
                            <p className="text-xs leading-5 text-text-grey">
                              Since this book has no saved page count, this will update the book’s
                              total pages and also save it as fully read.
                            </p>
                          </div>
                        )}

                        <div className="rounded-2xl border border-primary-dark-grey bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                            <CheckCheck size={14} />
                            Saved Reading Result
                          </div>
                          <p className="mt-2 text-lg font-bold text-heading-text-black">
                            Full book completed
                          </p>
                          <p className="mt-2 text-sm leading-6 text-text-grey">
                            This return will be recorded as a completed reading entry.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2 rounded-2xl border border-primary-dark-grey bg-white p-4">
                          <label className="text-sm font-semibold text-heading-text-black">
                            Pages read
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={pagesReadInput}
                            onChange={(e) => setPagesReadInput(e.target.value)}
                            className="w-full rounded-xl border border-primary-dark-grey bg-secondary-white p-3 text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                            placeholder="Enter pages read"
                          />
                        </div>

                        <div className="rounded-2xl border border-primary-dark-grey bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-text-grey">
                            <BookText size={14} />
                            Saved Total Pages
                          </div>
                          <p className="mt-2 text-2xl font-bold text-heading-text-black">
                            {activeRecord.book.pages ?? 'Not set'}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-text-grey">
                            If total pages are saved, pages read cannot exceed that number.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

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

            <div className="border-t border-primary-dark-grey px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={fullReset}
                  className="inline-flex items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-6 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCheckIn}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-dark-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-icon-green disabled:opacity-70"
                >
                  {loading ? 'Processing...' : 'Confirm & Check In'}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {isGlobalLeaveModalOpen && (
        <ModalShell onClose={() => setIsGlobalLeaveModalOpen(false)} maxWidth="max-w-7xl">
          <div className="flex max-h-[94vh] flex-col">
            <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-heading-text-black">
                    Manage Global Leave Days
                  </h3>
                  <p className="mt-1 text-sm text-text-grey">
                    These official leave dates are automatically excluded from overdue fine
                    calculations.
                  </p>
                </div>

                <button
                  onClick={() => setIsGlobalLeaveModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-text-grey transition hover:bg-primary-dark-grey hover:text-red-500"
                  aria-label="Close global leaves modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {globalHolidaysLoading ? (
                <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/30 p-12 text-center text-text-grey">
                  Loading global leave days...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <StatCard
                        icon={<CalendarDays size={14} />}
                        label="Total Selected"
                        value={sortedGlobalHolidayDateKeys.length}
                      />
                      <StatCard
                        icon={<Clock3 size={14} />}
                        label="First Leave"
                        value={
                          sortedGlobalHolidayDateKeys[0]
                            ? formatIST(sortedGlobalHolidayDateKeys[0])
                            : '-'
                        }
                      />
                      <StatCard
                        icon={<Clock3 size={14} />}
                        label="Last Leave"
                        value={
                          sortedGlobalHolidayDateKeys.length > 0
                            ? formatIST(
                                sortedGlobalHolidayDateKeys[
                                  sortedGlobalHolidayDateKeys.length - 1
                                ]
                              )
                            : '-'
                        }
                      />
                    </div>

                    <SectionCard
                      title="Pick Official Leave Days"
                      description="Select every official college leave date. All calculations use IST dates."
                    >
                      <div className="overflow-x-auto rounded-xl border border-primary-dark-grey bg-white p-3 sm:p-4">
                        <div className="flex min-w-[320px] justify-center">
                          <CustomDayPicker
                            mode="multiple"
                            selected={globalHolidays}
                            onSelect={(days) => setGlobalHolidays(days || [])}
                          />
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  <div className="space-y-4">
                    <SectionCard
                      title="Selected Leave Dates"
                      description="Dates are sorted automatically in order."
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-text-grey">
                          Total dates: {sortedGlobalHolidayDateKeys.length}
                        </div>

                        <button
                          onClick={() => setIsResetGlobalLeavesModalOpen(true)}
                          disabled={sortedGlobalHolidayDateKeys.length === 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <RotateCcw size={15} />
                          Reset All
                        </button>
                      </div>

                      <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {sortedGlobalHolidayDateKeys.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-primary-dark-grey bg-white p-6 text-center text-sm text-text-grey">
                            No global leave days selected yet.
                          </div>
                        ) : (
                          sortedGlobalHolidayDateKeys.map((dateKey, index) => (
                            <div
                              key={dateKey}
                              className="flex items-center justify-between gap-4 rounded-xl border border-primary-dark-grey bg-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-heading-text-black">
                                  {formatIST(dateKey, 'DD MMM YYYY')}
                                </p>
                                <p className="text-xs text-text-grey">
                                  {formatIST(dateKey, 'dddd')}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-xs font-bold text-text-grey">
                                #{index + 1}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </SectionCard>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-primary-dark-grey px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsGlobalLeaveModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-6 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveGlobalHolidays}
                  disabled={globalHolidaysLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-dark-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-icon-green disabled:opacity-70"
                >
                  {globalHolidaysLoading ? 'Saving...' : 'Save Global Leaves'}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {isResetGlobalLeavesModalOpen && (
        <ModalShell onClose={() => setIsResetGlobalLeavesModalOpen(false)} maxWidth="max-w-3xl">
          <div className="flex max-h-[90vh] flex-col">
            <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
              <h3 className="text-lg sm:text-xl font-bold text-heading-text-black">
                Clear All Global Leave Days?
              </h3>
              <p className="mt-1 text-sm text-text-grey">
                This will remove all currently saved global leave days from the system.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/40 p-4">
                <p className="mb-3 text-sm font-semibold text-heading-text-black">
                  Dates to be removed ({sortedGlobalHolidayDateKeys.length})
                </p>

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {sortedGlobalHolidayDateKeys.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-primary-dark-grey bg-white p-6 text-center text-sm text-text-grey">
                      No saved leave dates found.
                    </div>
                  ) : (
                    sortedGlobalHolidayDateKeys.map((dateKey, index) => (
                      <div
                        key={dateKey}
                        className="flex items-center justify-between gap-4 rounded-xl border border-primary-dark-grey bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-heading-text-black">
                            {formatIST(dateKey, 'DD MMM YYYY')}
                          </p>
                          <p className="text-xs text-text-grey">
                            {formatIST(dateKey, 'dddd')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs font-bold text-text-grey">
                          #{index + 1}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-primary-dark-grey px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsResetGlobalLeavesModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-6 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetGlobalHolidays}
                  disabled={globalHolidaysLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                >
                  {globalHolidaysLoading ? 'Clearing...' : 'Clear All Leave Days'}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan Book Barcode"
        onScanSuccess={(value) => {
          clearMessage()
          setBarcode(value)
        }}
      />
    </>
  )
}
