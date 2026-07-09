'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import clsx from 'classnames'
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  CheckCircle2,
  RefreshCw,
  Save,
  Search,
  UserRoundCog,
  UsersRound,
} from 'lucide-react'

type ActivePanel = 'single' | 'bulk'

type PatronData = {
  id: string
  name: string
  batch: string
  category: string
  barcode: string
  ph_no: string | null
  address: string | null
  dob: string | null
  email: string | null
  class: string | null
  image_link: string | null
}

type Feedback = {
  type: 'error' | 'success' | 'warning'
  message: string
}

export default function UpdatePatronsPage() {
  const router = useRouter()
  const barcodeRef = useRef<HTMLInputElement>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activePanel, setActivePanel] = useState<ActivePanel>('single')

  const [barcodeInput, setBarcodeInput] = useState('')
  const [patron, setPatron] = useState<PatronData | null>(null)
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleFeedback, setSingleFeedback] = useState<Feedback | null>(null)

  const [batches, setBatches] = useState<string[]>([])
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({})
  const [selectedBatch, setSelectedBatch] = useState('')
  const [newBatchName, setNewBatchName] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setAuthLoading(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!authLoading && activePanel === 'single') {
      setTimeout(() => barcodeRef.current?.focus(), 100)
    }
  }, [activePanel, authLoading])

  useEffect(() => {
    if (authLoading) return
    fetchBatches()
  }, [authLoading])

  const selectedBatchCount = useMemo(() => {
    return selectedBatch ? batchCounts[selectedBatch] || 0 : 0
  }, [batchCounts, selectedBatch])

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('members')
      .select('batch')
      .not('batch', 'is', null)
      .order('batch', { ascending: true })

    const rows = ((data || []) as { batch: string | null }[]).filter((row) => row.batch)
    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      const batch = row.batch as string
      acc[batch] = (acc[batch] || 0) + 1
      return acc
    }, {})

    setBatchCounts(counts)
    setBatches(Object.keys(counts).sort())
  }

  const resetSingleForm = () => {
    setBarcodeInput('')
    setPatron(null)
    setSingleFeedback(null)
    setSingleLoading(false)
    setTimeout(() => barcodeRef.current?.focus(), 100)
  }

  const handleFindPatron = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const barcode = barcodeInput.trim()
    if (!barcode) return

    setSingleLoading(true)
    setSingleFeedback(null)
    setPatron(null)

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (error || !data) {
      setSingleFeedback({ type: 'error', message: 'No patron found with that barcode.' })
    } else {
      setPatron(data as PatronData)
    }

    setSingleLoading(false)
  }

  const handleSingleUpdate = async () => {
    if (!patron) return

    setSingleLoading(true)
    setSingleFeedback(null)

    const { error } = await supabase
      .from('members')
      .update({
        name: patron.name,
        batch: patron.batch,
        category: patron.category,
        ph_no: patron.ph_no,
        address: patron.address,
        dob: patron.dob,
        email: patron.email,
        class: patron.class,
        image_link: patron.image_link,
      })
      .eq('id', patron.id)

    if (error) {
      setSingleFeedback({ type: 'error', message: `Failed to update patron: ${error.message}` })
    } else {
      setSingleFeedback({ type: 'success', message: 'Patron updated successfully.' })
      fetchBatches()
    }

    setSingleLoading(false)
  }

  const handleBulkBatchUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextBatch = newBatchName.trim()

    if (!selectedBatch || !nextBatch) {
      setBulkFeedback({ type: 'error', message: 'Select the current batch and enter the new batch name.' })
      return
    }

    if (selectedBatch === nextBatch) {
      setBulkFeedback({ type: 'warning', message: 'The new batch name is the same as the current batch.' })
      return
    }

    const confirmed = window.confirm(
      `Update ${selectedBatchCount} patron(s) from batch "${selectedBatch}" to "${nextBatch}"?`
    )
    if (!confirmed) return

    setBulkLoading(true)
    setBulkFeedback(null)

    const { error } = await supabase
      .from('members')
      .update({ batch: nextBatch })
      .eq('batch', selectedBatch)

    if (error) {
      setBulkFeedback({ type: 'error', message: `Batch update failed: ${error.message}` })
    } else {
      setBulkFeedback({
        type: 'success',
        message: `Updated ${selectedBatchCount} patron(s) from ${selectedBatch} to ${nextBatch}.`,
      })
      setSelectedBatch('')
      setNewBatchName('')
      fetchBatches()
    }

    setBulkLoading(false)
  }

  if (authLoading) return <Loading />

  return (
    <main className="min-h-screen bg-primary-grey px-4 pb-10 pt-24">
      <div className="mx-auto max-w-5xl">
        <Link href="/members" className="mb-4 flex items-center gap-2 font-semibold text-text-grey transition hover:text-heading-text-black">
          <ArrowLeft size={18} />
          Back to Patron Management
        </Link>

        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wider text-heading-text-black md:text-4xl">
            Update Patrons
          </h1>
          <p className="mt-1 text-text-grey">Update one patron by barcode, or rename a batch for multiple patrons.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-secondary-white p-2 shadow-sm border border-primary-dark-grey">
          <PanelButton
            active={activePanel === 'single'}
            icon={<UserRoundCog size={18} />}
            label="Update a Patron"
            onClick={() => setActivePanel('single')}
          />
          <PanelButton
            active={activePanel === 'bulk'}
            icon={<UsersRound size={18} />}
            label="Bulk Batch Update"
            onClick={() => setActivePanel('bulk')}
          />
        </div>

        {activePanel === 'single' ? (
          <section className="rounded-2xl border border-primary-dark-grey bg-secondary-white p-6 shadow-xl md:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-heading-text-black">Update One Patron</h2>
              <p className="mt-1 text-sm text-text-grey">Find a member by barcode and update their name, batch, or category.</p>
            </div>

            {singleFeedback && <FeedbackBox feedback={singleFeedback} />}

            {!patron ? (
              <form onSubmit={handleFindPatron} className="space-y-4">
                <label htmlFor="barcode-search" className="block text-sm font-semibold text-text-grey">
                  Enter a barcode to find and edit a patron.
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Barcode className="h-5 w-5 text-text-grey" />
                  </div>
                  <input
                    ref={barcodeRef}
                    id="barcode-search"
                    type="text"
                    placeholder="Scan or type barcode"
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 pl-12 text-text-grey placeholder-text-grey outline-none transition focus:ring-2 focus:ring-dark-green"
                  />
                </div>
                <button
                  type="submit"
                  disabled={singleLoading || !barcodeInput.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-dark-green px-8 py-3 font-bold text-white transition hover:bg-icon-green disabled:opacity-60"
                >
                  <Search size={18} />
                  {singleLoading ? 'Searching...' : 'Find Patron'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-text-grey">Name</label>
                    <input
                      type="text"
                      value={patron.name}
                      onChange={(event) => setPatron({ ...patron, name: event.target.value })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Batch</label>
                    <input
                      type="text"
                      value={patron.batch}
                      onChange={(event) => setPatron({ ...patron, batch: event.target.value })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Category</label>
                    <select
                      value={patron.category}
                      onChange={(event) => setPatron({ ...patron, category: event.target.value })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="class">class</option>
                      <option value="outside">outsider</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-text-grey">Barcode</label>
                    <input
                      type="text"
                      value={patron.barcode}
                      readOnly
                      className="mt-1 w-full cursor-not-allowed rounded-md border border-primary-dark-grey bg-gray-200 p-2 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Phone Number</label>
                    <input
                      type="text"
                      value={patron.ph_no || ''}
                      onChange={(event) => setPatron({ ...patron, ph_no: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Email</label>
                    <input
                      type="email"
                      value={patron.email || ''}
                      onChange={(event) => setPatron({ ...patron, email: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Date of Birth</label>
                    <input
                      type="date"
                      value={patron.dob || ''}
                      onChange={(event) => setPatron({ ...patron, dob: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-text-grey">Class</label>
                    <input
                      type="text"
                      value={patron.class || ''}
                      onChange={(event) => setPatron({ ...patron, class: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-text-grey">Address</label>
                    <input
                      type="text"
                      value={patron.address || ''}
                      onChange={(event) => setPatron({ ...patron, address: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-text-grey">Image Drive Link</label>
                    <input
                      type="text"
                      value={patron.image_link || ''}
                      onChange={(event) => setPatron({ ...patron, image_link: event.target.value || null })}
                      className="mt-1 w-full rounded-md border border-primary-dark-grey bg-primary-grey p-2"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
                  <button
                    onClick={resetSingleForm}
                    className="rounded-lg border border-primary-dark-grey bg-secondary-white px-5 py-2 text-sm font-semibold hover:bg-primary-dark-grey"
                  >
                    Find Another
                  </button>
                  <button
                    onClick={handleSingleUpdate}
                    disabled={singleLoading}
                    className="flex items-center justify-center gap-2 rounded-lg bg-dark-green px-5 py-2 text-sm font-semibold text-white hover:bg-icon-green disabled:opacity-70"
                  >
                    <Save size={16} />
                    {singleLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-primary-dark-grey bg-secondary-white p-6 shadow-xl md:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-heading-text-black">Update Patrons in Bulk</h2>
              <p className="mt-1 text-sm text-text-grey">Rename the batch field for every patron currently in one batch.</p>
            </div>

            {bulkFeedback && <FeedbackBox feedback={bulkFeedback} />}

            <form onSubmit={handleBulkBatchUpdate} className="space-y-4">
              <div>
                <label htmlFor="current-batch" className="block text-sm font-semibold text-text-grey">
                  Current Batch
                </label>
                <select
                  id="current-batch"
                  value={selectedBatch}
                  onChange={(event) => setSelectedBatch(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                >
                  <option value="">Select current batch</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch} ({batchCounts[batch]} patrons)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-batch" className="block text-sm font-semibold text-text-grey">
                  New Batch Name
                </label>
                <input
                  id="new-batch"
                  value={newBatchName}
                  onChange={(event) => setNewBatchName(event.target.value)}
                  placeholder="Enter new batch name"
                  className="mt-1 w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>

              {selectedBatch && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <strong>{selectedBatchCount}</strong> patron(s) will be updated from batch <strong>{selectedBatch}</strong>.
                </div>
              )}

              <button
                type="submit"
                disabled={bulkLoading || !selectedBatch || !newBatchName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-button-yellow px-8 py-3 font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={18} />
                {bulkLoading ? 'Updating...' : 'Update Batch Name'}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

function PanelButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition',
        active ? 'bg-dark-green text-white shadow-sm' : 'text-text-grey hover:bg-primary-grey hover:text-heading-text-black'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  return (
    <div
      className={clsx(
        'mb-4 flex items-start gap-3 rounded-lg p-3 text-sm',
        feedback.type === 'error' && 'bg-red-100 text-red-800',
        feedback.type === 'success' && 'bg-green-100 text-green-800',
        feedback.type === 'warning' && 'bg-yellow-100 text-yellow-800'
      )}
    >
      {feedback.type === 'success' ? (
        <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
      )}
      <span className="font-medium">{feedback.message}</span>
    </div>
  )
}
