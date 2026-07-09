'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffUser, StaffUser } from '@/lib/staff-user'
import {
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Camera,
  X,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck,
  ScanLine,
} from 'lucide-react'
import clsx from 'classnames'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'

type MemberSuggestion = {
  name: string
  barcode: string
}

type HoldPolicy = 'strict' | 'flexible'

type SelectedMember = {
  id?: string
  name: string
  barcode: string
}

export default function HoldForm() {
  const [memberBarcode, setMemberBarcode] = useState('')
  const [bookBarcode, setBookBarcode] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [memberQuery, setMemberQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const [holdPolicy, setHoldPolicy] = useState<HoldPolicy>('strict')
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(null)

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

  const fetchMemberSuggestions = async () => {
    const query = memberQuery.trim()

    const { data, error } = await supabase
      .from('members')
      .select('name, barcode')
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(5)

    if (!error && data) {
      setSuggestions(data)
      setActiveSuggestionIndex(data.length > 0 ? 0 : -1)
    } else {
      setSuggestions([])
      setActiveSuggestionIndex(-1)
    }
  }

  const clearMessage = () => {
    setMessage('')
    setIsError(false)
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

  const resetAll = () => {
    setBookBarcode('')
    setMemberBarcode('')
    setMemberQuery('')
    setSelectedMember(null)
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setHoldPolicy('strict')
    setLoading(false)
    setTimeout(() => memberInputRef.current?.focus(), 200)
  }

  const resetAfterSuccess = () => {
    setBookBarcode('')
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setLoading(false)
    setTimeout(() => bookInputRef.current?.focus(), 200)
  }

  const clearSelectedMember = () => {
    setMemberBarcode('')
    setMemberQuery('')
    setSelectedMember(null)
    setSuggestions([])
    setActiveSuggestionIndex(-1)
    setBookBarcode('')
    clearMessage()
    setTimeout(() => memberInputRef.current?.focus(), 100)
  }

  const resolveMember = async () => {
    if (!memberBarcode) return null

    const { data: member, error } = await supabase
      .from('members')
      .select('id, name, barcode')
      .eq('barcode', memberBarcode)
      .single()

    if (error || !member) return null
    return member
  }

  const handleHold = async () => {
    if (!memberBarcode || !bookBarcode) return

    setLoading(true)
    clearMessage()

    let member = await resolveMember()

    if (!member) {
      setMessage('Member not found. Please check the member barcode or choose a valid member.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => memberInputRef.current?.focus(), 100)
      return
    }

    setSelectedMember({
      id: member.id,
      name: member.name,
      barcode: member.barcode,
    })
    setMemberQuery(`${member.name} (${member.barcode})`)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, status, barcode')
      .eq('barcode', bookBarcode)
      .single()

    if (bookError || !book) {
      setMessage('Book not found. Please check the book barcode.')
      setIsError(true)
      setLoading(false)
      setTimeout(() => bookInputRef.current?.focus(), 100)
      return
    }

    const { data: existingHold, error: existingHoldError } = await supabase
      .from('hold_records')
      .select('id')
      .eq('book_id', book.id)
      .eq('released', false)
      .maybeSingle()

    if (existingHoldError) {
      setMessage('Unable to verify existing hold status. Please try again.')
      setIsError(true)
      setLoading(false)
      return
    }

    if (existingHold) {
      setMessage(`Book "${book.title}" is already on hold for another member.`)
      setIsError(true)
      setLoading(false)
      setTimeout(() => bookInputRef.current?.focus(), 100)
      return
    }

    const { error: holdError } = await supabase
      .from('hold_records')
      .insert({
        book_id: book.id,
        member_id: member.id,
        hold_policy: holdPolicy,
        hold_by_id: staffUser?.id || null,
        hold_by_name: staffUser?.displayName || null,
      })

    if (holdError) {
      setMessage('Could not place a hold on the book. Please try again.')
      setIsError(true)
      setLoading(false)
      return
    }

    if (book.status === 'available') {
      const { error: updateBookError } = await supabase
        .from('books')
        .update({ status: 'held' })
        .eq('id', book.id)

      if (updateBookError) {
        setMessage('Hold was placed, but the book status could not be updated.')
        setIsError(true)
        setLoading(false)
        return
      }
    }

    setMessage(
      holdPolicy === 'strict'
        ? `Book "${book.title}" has been placed on mandatory hold for ${member.name}.`
        : `Book "${book.title}" has been placed on flexible hold for ${member.name}.`
    )
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
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-visible rounded-2xl border border-primary-dark-grey bg-white shadow-sm">
        <div className="border-b border-primary-dark-grey px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-heading-text-black sm:text-xl">
            Place a Book on Hold
          </h2>
          <p className="mt-1 text-sm text-text-grey">
            Select a member, scan the book barcode, choose a hold policy, and place the request.
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
                  placeholder="Enter member name or barcode"
                  className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-24 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
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
                <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-primary-dark-grey bg-white shadow-lg">
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
                  placeholder="Scan or enter book barcode"
                  className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-12 pr-14 text-sm text-heading-text-black placeholder:text-text-grey transition focus:outline-none focus:ring-2 focus:ring-dark-green"
                  value={bookBarcode}
                  onChange={(e) => {
                    clearMessage()
                    setBookBarcode(e.target.value)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleHold()}
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
                  <p className="mt-1 break-all text-xs text-text-grey">
                    Barcode: {selectedMember.barcode}
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

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-heading-text-black">
                Hold Policy
              </h3>
              <p className="mt-1 text-sm text-text-grey">
                Choose how the hold should work in the circulation system.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label
                className={clsx(
                  'cursor-pointer rounded-2xl border p-4 transition',
                  holdPolicy === 'strict'
                    ? 'border-red-200 bg-red-50 ring-1 ring-red-200'
                    : 'border-primary-dark-grey bg-primary-grey/40 hover:bg-primary-grey/70'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="holdPolicy"
                    className="mt-1 accent-red-600"
                    value="strict"
                    checked={holdPolicy === 'strict'}
                    onChange={() => setHoldPolicy('strict')}
                    disabled={loading}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-heading-text-black">
                        Mandatory Hold
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-grey sm:text-sm">
                      Nobody else can check out this book until the hold is released.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={clsx(
                  'cursor-pointer rounded-2xl border p-4 transition',
                  holdPolicy === 'flexible'
                    ? 'border-amber-200 bg-amber-50 ring-1 ring-amber-200'
                    : 'border-primary-dark-grey bg-primary-grey/40 hover:bg-primary-grey/70'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="holdPolicy"
                    className="mt-1 accent-amber-600"
                    value="flexible"
                    checked={holdPolicy === 'flexible'}
                    onChange={() => setHoldPolicy('flexible')}
                    disabled={loading}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-heading-text-black">
                        Flexible Hold
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-grey sm:text-sm">
                      The hold is noted, but others may borrow the book for now if needed.
                    </p>
                  </div>
                </div>
              </label>
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
                  After a successful hold, the selected member stays active so you can quickly scan another book for the same member.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-primary-dark-grey pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-grey">
              Verify the member and book barcode before placing the hold.
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
                onClick={handleHold}
                className="inline-flex w-full items-center justify-center rounded-xl bg-button-yellow px-6 py-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={loading || !memberBarcode || !bookBarcode}
              >
                {loading ? 'Processing...' : 'Place Hold'}
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
    </div>
  )
}
