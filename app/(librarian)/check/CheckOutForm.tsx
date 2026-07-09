'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { sendLibraryNotification } from '@/lib/notification-events-client'
import { getCurrentStaffUser, StaffUser } from '@/lib/staff-user'
import dayjs from 'dayjs'
import {
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  AlertTriangle,
  Camera,
  BadgeCheck,
  ScanLine,
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'
import clsx from 'classnames'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'

type HeldInfo = {
  bookId: string
  bookTitle: string
  authorName?: string | null
  holdId: string
  heldForMemberName: string
  holdPolicy: 'strict' | 'flexible'
}

type MemberSuggestion = {
  name: string
  barcode: string
}

type SelectedMember = {
  id?: string
  name: string
  barcode: string
  category?: string | null
}

function ModalShell({
  children,
  maxWidth = 'max-w-lg',
}: {
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
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

export default function CheckOutForm() {
  const [memberBarcode, setMemberBarcode] = useState('')
  const [bookBarcode, setBookBarcode] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [memberQuery, setMemberQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null)

  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false)
  const [heldInfo, setHeldInfo] = useState<HeldInfo | null>(null)

  const [isFineModalOpen, setIsFineModalOpen] = useState(false)
  const [fineWarningMember, setFineWarningMember] = useState<any>(null)

  const [isMemberScannerOpen, setIsMemberScannerOpen] = useState(false)
  const [isBookScannerOpen, setIsBookScannerOpen] = useState(false)
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)

  const memberInputRef = useRef<HTMLInputElement>(null)
  const bookInputRef = useRef<HTMLInputElement>(null)

  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.matchMedia('(pointer: coarse)').matches
    )
  }, [])

  useEffect(() => {
    memberInputRef.current?.focus()
    void getCurrentStaffUser().then(setStaffUser)
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (memberQuery.trim().length > 1 && memberBarcode === '') {
        fetchMemberSuggestions()
      } else {
        setSuggestions([])
        setActiveSuggestionIndex(-1)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [memberQuery, memberBarcode])

  const clearMessage = () => {
    setMessage('')
    setIsError(false)
  }

  const fetchMemberSuggestions = async () => {
    const query = memberQuery.trim()

    const { data } = await supabase
      .from('members')
      .select('name, barcode')
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(5)

    if (data) {
      setSuggestions(data)
      setActiveSuggestionIndex(data.length > 0 ? 0 : -1)
    } else {
      setSuggestions([])
      setActiveSuggestionIndex(-1)
    }
  }

  const handleSelectMember = (member: MemberSuggestion) => {
    clearMessage()
    setMemberBarcode(member.barcode)
    setMemberQuery(`${member.name} (${member.barcode})`)
    setSelectedMember({
      name: member.name,
      barcode: member.barcode,
    })
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setTimeout(() => bookInputRef.current?.focus(), 100)
  }

  const getDueDate = (category: string | null | undefined) => {
    const dueInDays =
      category === 'student'
        ? 14
        : category === 'teacher' || category === 'outside' || category === 'class'
          ? 30
          : 14

    return dayjs().startOf('day').add(dueInDays, 'day').format('YYYY-MM-DD')
  }

  const resolveMember = async () => {
    if (!memberBarcode) return null

    const { data: member, error } = await supabase
      .from('members')
      .select('id, name, barcode, category')
      .eq('barcode', memberBarcode)
      .single()

    if (error || !member) return null
    return member
  }

  const resetAll = () => {
    setMemberBarcode('')
    setBookBarcode('')
    setMemberQuery('')
    setSelectedMember(null)
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setLoading(false)
    setHeldInfo(null)
    setIsHoldModalOpen(false)
    setIsFineModalOpen(false)
    setFineWarningMember(null)
    setMessage('')
    setIsError(false)

    setTimeout(() => memberInputRef.current?.focus(), 100)
  }

  const resetAfterSuccess = () => {
    setBookBarcode('')
    setLoading(false)
    setHeldInfo(null)
    setIsHoldModalOpen(false)
    setIsFineModalOpen(false)
    setFineWarningMember(null)
    setTimeout(() => bookInputRef.current?.focus(), 100)
  }

  const clearSelectedMember = () => {
    setMemberBarcode('')
    setBookBarcode('')
    setMemberQuery('')
    setSelectedMember(null)
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setHeldInfo(null)
    setIsHoldModalOpen(false)
    setIsFineModalOpen(false)
    setFineWarningMember(null)
    clearMessage()

    setTimeout(() => memberInputRef.current?.focus(), 100)
  }

  const handleCheckout = async () => {
    if (!memberBarcode || !bookBarcode) return

    setLoading(true)
    clearMessage()

    let member = await resolveMember()

    if (!member) {
      setMessage('Member not found. Please check the name or barcode.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => memberInputRef.current?.focus(), 100)
      return
    }

    setSelectedMember({
      id: member.id,
      name: member.name,
      barcode: member.barcode,
      category: member.category,
    })
    setMemberQuery(`${member.name} (${member.barcode})`)

    const { count: unpaidFines, error: fineError } = await supabase
      .from('borrow_records')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .eq('fine_paid', false)
      .gt('fine', 0)

    if (fineError) {
      setMessage("Could not verify member's fine status.")
      setIsError(true)
      setLoading(false)
      return
    }

    if (unpaidFines && unpaidFines > 0) {
      setFineWarningMember(member)
      setIsFineModalOpen(true)
      setLoading(false)
      return
    }

    await proceedWithBookChecks(member)
  }

  const proceedWithBookChecks = async (member: any) => {
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, author, status')
      .eq('barcode', bookBarcode)
      .or('status.eq.available,status.eq.held')
      .single()

    if (bookError || !book) {
      setMessage('Book is not available for checkout or barcode is incorrect.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => bookInputRef.current?.focus(), 100)
      return
    }

    if (book.status === 'held') {
      const { data: holdRecord } = await supabase
        .from('hold_records')
        .select('id, hold_policy, member:members!inner(name)')
        .eq('book_id', book.id)
        .eq('released', false)
        .single()

      if (holdRecord) {
        const memberName = Array.isArray(holdRecord.member)
          ? holdRecord.member[0]?.name
          : (holdRecord.member as any)?.name

        if (memberName) {
          setHeldInfo({
            bookId: book.id,
            bookTitle: book.title,
            authorName: book.author,
            holdId: holdRecord.id,
            heldForMemberName: memberName,
            holdPolicy: holdRecord.hold_policy ?? 'strict',
          })
          setIsHoldModalOpen(true)
          setLoading(false)
          return
        }
      }
    }

    await finalizeCheckout(book.id, book.title, book.author, member)
  }

  const handleSkipFine = () => {
    if (fineWarningMember) {
      setIsFineModalOpen(false)
      setLoading(true)
      void proceedWithBookChecks(fineWarningMember)
    }
  }

  const finalizeCheckout = async (bookId: string, bookTitle: string, authorName: string | null, member: any) => {
    const dueDate = getDueDate(member.category)

    const { error: rpcError } = await supabase.rpc('checkout_book', {
      p_book_id: bookId,
      p_member_id: member.id,
      p_due_date: dueDate,
    })

    if (rpcError) {
      setMessage(rpcError.message || 'Failed to complete checkout.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => bookInputRef.current?.focus(), 100)
      return
    }

    if (staffUser) {
      await supabase
        .from('borrow_records')
        .update({
          checkout_by_id: staffUser.id,
          checkout_by_name: staffUser.displayName,
        })
        .eq('book_id', bookId)
        .eq('member_id', member.id)
        .is('return_date', null)
    }

    setMessage(
      `"${bookTitle}" issued to ${member.name}. Return by ${dayjs(dueDate).format('DD MMM YYYY')}.`
    )
    void sendLibraryNotification({
      type: 'checkout',
      memberId: member.id,
      bookTitle,
      authorName,
      checkoutDate: dayjs().format('YYYY-MM-DD'),
      dueDate,
    })
    setIsError(false)
    resetAfterSuccess()
  }

  const handleConfirmHeldCheckout = async () => {
    if (!heldInfo) return

    setLoading(true)
    setIsHoldModalOpen(false)

    const member = await resolveMember()

    if (!member) {
      setMessage('Member not found.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => memberInputRef.current?.focus(), 100)
      return
    }

    setSelectedMember({
      id: member.id,
      name: member.name,
      barcode: member.barcode,
      category: member.category,
    })

    const dueDate = getDueDate(member.category)

    const { error: rpcError } = await supabase.rpc('checkout_held_book', {
      p_hold_id: heldInfo.holdId,
      p_book_id: heldInfo.bookId,
      p_member_id: member.id,
      p_due_date: dueDate,
    })

    if (rpcError) {
      setMessage(rpcError.message || 'Failed to process checkout for held book.')
      setIsError(true)
      setLoading(false)
      return
    }

    if (staffUser) {
      await supabase
        .from('borrow_records')
        .update({
          checkout_by_id: staffUser.id,
          checkout_by_name: staffUser.displayName,
        })
        .eq('book_id', heldInfo.bookId)
        .eq('member_id', member.id)
        .is('return_date', null)
    }

    setMessage(
      `Held book "${heldInfo.bookTitle}" issued to ${member.name}. Return by ${dayjs(dueDate).format('DD MMM YYYY')}.`
    )
    void sendLibraryNotification({
      type: 'checkout',
      memberId: member.id,
      bookTitle: heldInfo.bookTitle,
      authorName: heldInfo.authorName,
      checkoutDate: dayjs().format('YYYY-MM-DD'),
      dueDate,
    })
    setIsError(false)
    resetAfterSuccess()
  }

  const handleMemberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()

      if (suggestions.length > 0 && activeSuggestionIndex >= 0) {
        handleSelectMember(suggestions[activeSuggestionIndex])
        return
      }

      if (memberQuery.trim()) {
        clearMessage()
        setMemberBarcode(memberQuery.trim())
        setSelectedMember(null)
        setSuggestions([])
        setActiveSuggestionIndex(-1)
        setTimeout(() => bookInputRef.current?.focus(), 100)
      }
      return
    }

    if (e.key === 'Escape') {
      setSuggestions([])
      setActiveSuggestionIndex(-1)
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-primary-dark-grey bg-white shadow-sm">
          <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
            <h2 className="text-lg sm:text-xl font-bold text-heading-text-black">
              Check Out a Book
            </h2>
            <p className="mt-1 text-sm text-text-grey">
              Select a member, scan the book barcode, verify any warnings, and issue the book.
            </p>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="relative min-w-0">
                <label className="mb-2 block text-sm font-semibold text-heading-text-black">
                  Member
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-text-grey" />
                  </div>

                  <input
                    ref={memberInputRef}
                    type="text"
                    className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-24 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                    placeholder="Enter member name or barcode"
                    value={memberQuery}
                    onChange={(e) => {
                      clearMessage()
                      setMemberQuery(e.target.value)
                      setMemberBarcode('')
                      setSelectedMember(null)
                    }}
                    onKeyDown={handleMemberKeyDown}
                    disabled={loading}
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    {isMobileDevice && !loading && (
                      <button
                        type="button"
                        onClick={() => setIsMemberScannerOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-dark-green"
                        aria-label="Scan member barcode"
                      >
                        <Camera size={18} />
                      </button>
                    )}

                    {memberQuery && !loading && (
                      <button
                        type="button"
                        onClick={clearSelectedMember}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-red-500"
                        aria-label="Clear member"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-primary-dark-grey bg-secondary-white shadow-lg">
                    {suggestions.map((member, index) => (
                      <li
                        key={member.barcode}
                        onClick={() => handleSelectMember(member)}
                        className={clsx(
                          'cursor-pointer px-4 py-3 transition',
                          activeSuggestionIndex === index
                            ? 'bg-primary-grey'
                            : 'hover:bg-primary-grey'
                        )}
                      >
                        <span className="block break-words text-sm font-semibold text-heading-text-black">
                          {member.name}
                        </span>
                        <span className="block break-all text-xs text-text-grey">
                          {member.barcode}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative min-w-0">
                <label className="mb-2 block text-sm font-semibold text-heading-text-black">
                  Book Barcode
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <BookOpen className="h-5 w-5 text-text-grey" />
                  </div>

                  <input
                    ref={bookInputRef}
                    type="text"
                    className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-14 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                    placeholder="Scan or enter book barcode"
                    value={bookBarcode}
                    onChange={(e) => {
                      clearMessage()
                      setBookBarcode(e.target.value)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
                    disabled={loading}
                  />

                  {isMobileDevice && !loading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <button
                        type="button"
                        onClick={() => setIsBookScannerOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-grey transition hover:bg-secondary-white hover:text-dark-green"
                        aria-label="Scan book barcode"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedMember && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-green-700" />
                      <p className="text-sm font-semibold text-green-800">
                        Selected Member
                      </p>
                    </div>

                    <p className="mt-2 break-words text-sm font-semibold text-heading-text-black">
                      {selectedMember.name}
                    </p>
                    <p className="mt-1 break-all text-xs text-text-grey capitalize">
                      Barcode: {selectedMember.barcode}
                      {selectedMember.category ? ` • ${selectedMember.category}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedMember}
                    className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
                  >
                    Change Member
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/30 p-4">
              <div className="flex items-start gap-3">
                <ScanLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-dark-green" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading-text-black">
                    Staff Workflow Tip
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-grey">
                    After a successful checkout, the selected member stays active so you can issue
                    another book faster without searching again.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-primary-dark-grey pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-grey">
                Verify both member and book barcode before confirming checkout.
              </p>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey sm:w-auto"
                  disabled={loading}
                >
                  Reset
                </button>

                <button
                  onClick={handleCheckout}
                  disabled={loading || !memberBarcode || !bookBarcode}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-button-yellow px-6 py-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? 'Processing...' : 'Check Out'}
                </button>
              </div>
            </div>

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

      {isFineModalOpen && fineWarningMember && (
        <ModalShell maxWidth="max-w-md">
          <div className="border-b border-primary-dark-grey px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-heading-text-black">
                  Outstanding Fine
                </h3>
                <p className="mt-1 text-sm text-text-grey">
                  This member currently has unpaid fines.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsFineModalOpen(false)
                  setFineWarningMember(null)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-grey transition hover:bg-primary-dark-grey hover:text-red-500"
                aria-label="Close fine warning"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-red-600" />
              <p className="mt-3 break-words text-base font-semibold text-heading-text-black">
                {fineWarningMember.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-grey">
                Borrowing is usually restricted until fines are paid.
              </p>
            </div>

            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/40 p-4">
              <p className="text-sm leading-6 text-text-grey">
                To review the member’s pending fines, open the{' '}
                <Link href="/fines" className="font-semibold text-dark-green hover:underline">
                  Fine Page
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="border-t border-primary-dark-grey px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setIsFineModalOpen(false)
                  setFineWarningMember(null)
                  setLoading(false)
                  setTimeout(() => bookInputRef.current?.focus(), 100)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
              >
                Cancel
              </button>

              <button
                onClick={handleSkipFine}
                className="inline-flex items-center justify-center rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-yellow-700"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {isHoldModalOpen && heldInfo && (
        <ModalShell maxWidth="max-w-md">
          <div className="border-b border-primary-dark-grey px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-heading-text-black">
                  Book on Hold
                </h3>
                <p className="mt-1 text-sm text-text-grey">
                  This book has an active hold request.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsHoldModalOpen(false)
                  setHeldInfo(null)
                  setLoading(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-grey transition hover:bg-primary-dark-grey hover:text-red-500"
                aria-label="Close hold warning"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div
              className={clsx(
                'rounded-2xl border p-4 text-center',
                heldInfo.holdPolicy === 'strict'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              )}
            >
              {heldInfo.holdPolicy === 'strict' ? (
                <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
              ) : (
                <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />
              )}

              <p className="mt-3 break-words text-base font-semibold text-heading-text-black">
                {heldInfo.bookTitle}
              </p>

              <p className="mt-2 text-sm leading-6 text-text-grey">
                Held for{' '}
                <strong className="text-heading-text-black">
                  {heldInfo.heldForMemberName}
                </strong>
                .
              </p>

              <div className="mt-3">
                <span
                  className={clsx(
                    'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                    heldInfo.holdPolicy === 'strict'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {heldInfo.holdPolicy === 'strict' ? 'Mandatory Hold' : 'Flexible Hold'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/40 p-4">
              <p className="text-sm leading-6 text-text-grey">
                {heldInfo.holdPolicy === 'strict'
                  ? 'This book should not be issued to anyone else until the hold is released.'
                  : 'This hold is flexible, so checkout can continue if required.'}
              </p>
            </div>
          </div>

          <div className="border-t border-primary-dark-grey px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setIsHoldModalOpen(false)
                  setHeldInfo(null)
                  setLoading(false)
                  setTimeout(() => bookInputRef.current?.focus(), 100)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-primary-dark-grey bg-white px-5 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-grey"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmHeldCheckout}
                disabled={heldInfo.holdPolicy === 'strict'}
                className={clsx(
                  'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition',
                  heldInfo.holdPolicy === 'strict'
                    ? 'cursor-not-allowed bg-primary-dark-grey text-text-grey'
                    : 'bg-dark-green text-white hover:bg-icon-green'
                )}
              >
                Continue Checkout
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      <BarcodeScannerModal
        isOpen={isMemberScannerOpen}
        onClose={() => setIsMemberScannerOpen(false)}
        title="Scan Member Barcode"
        onScanSuccess={(value) => {
          clearMessage()
          setMemberBarcode(value)
          setMemberQuery(value)
          setSelectedMember(null)
          setSuggestions([])
          setActiveSuggestionIndex(-1)
          setTimeout(() => bookInputRef.current?.focus(), 100)
        }}
      />

      <BarcodeScannerModal
        isOpen={isBookScannerOpen}
        onClose={() => setIsBookScannerOpen(false)}
        title="Scan Book Barcode"
        onScanSuccess={(value) => {
          clearMessage()
          setBookBarcode(value)
        }}
      />
    </>
  )
}
