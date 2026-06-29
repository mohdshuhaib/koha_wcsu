'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteAuthUserByEmail } from '@/app/actions/deleteMember'
import Link from 'next/link'
import {
  ArrowLeft, Search, Trash2, AlertTriangle, CheckCircle2, XCircle, User
} from 'lucide-react'
import clsx from 'classnames'
import Loading from '@/app/loading'

type MemberInfo = {
  id: string;
  name: string;
  barcode: string;
}

export default function DeleteMultipleMembers() {
  const [barcodes, setBarcodes] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning', message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<string[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)

  // State for the two-step process
  const [step, setStep] = useState<'find' | 'confirm'>('find')
  const [membersToDelete, setMembersToDelete] = useState<MemberInfo[]>([])
  const [notFoundBarcodes, setNotFoundBarcodes] = useState<string[]>([])

  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase
        .from('members')
        .select('batch')
        .not('batch', 'is', null)
        .order('batch', { ascending: true })

      const uniqueBatches = Array.from(
        new Set(((data || []) as { batch: string | null }[]).map((member) => member.batch).filter(Boolean) as string[])
      )

      setBatches(uniqueBatches)
    }

    fetchBatches()
  }, [])

  const handleBatchSelect = async (batch: string) => {
    setSelectedBatch(batch)
    setFeedback(null)
    setStep('find')
    setMembersToDelete([])
    setNotFoundBarcodes([])

    if (!batch) return

    setBatchLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('barcode')
      .eq('batch', batch)
      .order('name', { ascending: true })

    if (error) {
      setFeedback({ type: 'error', message: `Could not load batch barcodes: ${error.message}` })
      setBatchLoading(false)
      return
    }

    const batchBarcodes = ((data || []) as { barcode: string }[]).map((member) => member.barcode).filter(Boolean)
    setBarcodes(batchBarcodes.join(', '))
    setFeedback({
      type: batchBarcodes.length > 0 ? 'warning' : 'error',
      message: batchBarcodes.length > 0
        ? `Loaded ${batchBarcodes.length} barcode(s) from batch ${batch}. Review before deleting.`
        : `No patrons found in batch ${batch}.`,
    })
    setBatchLoading(false)
  }

  const handleFindMembers = async (e: React.FormEvent) => {
    e.preventDefault()
    // Allow commas or new lines as separators
    const barcodeList = barcodes.split(/[\n,]+/).map((b) => b.trim()).filter(Boolean)

    if (barcodeList.length === 0) {
      setFeedback({ type: 'error', message: 'Please enter at least one barcode.' })
      return
    }

    setLoading(true)
    setFeedback(null)

    const { data, error } = await supabase
      .from('members')
      .select('id, name, barcode')
      .in('barcode', barcodeList)

    if (error) {
      setFeedback({ type: 'error', message: `An error occurred: ${error.message}` })
      setLoading(false)
      return
    }

    const foundBarcodes = new Set(data.map(m => m.barcode));
    const notFound = barcodeList.filter(b => !foundBarcodes.has(b));

    setMembersToDelete(data as MemberInfo[])
    setNotFoundBarcodes(notFound)

    if (data.length > 0) {
      setStep('confirm')
    } else {
      setFeedback({ type: 'error', message: 'No patrons were found matching the provided barcodes.' })
    }
    setLoading(false)
  }

  const handleBulkDelete = async () => {
    if (membersToDelete.length === 0) return
    setLoading(true)
    setFeedback(null)

    const memberIds = membersToDelete.map(m => m.id)

    // 1. Delete members from the database (cascade will handle records)
    const { error: dbError } = await supabase.from('members').delete().in('id', memberIds)

    if (dbError) {
      setFeedback({ type: 'error', message: `Deletion failed: ${dbError.message}` })
      setLoading(false)
      return
    }

    // 2. Delete auth users one by one
    let authFailures = 0;
    for (const member of membersToDelete) {
      const deleted = await deleteAuthUserByEmail(`${member.barcode.toLowerCase()}@member.wcsu`)
      if (!deleted) {
        authFailures++;
      }
    }

    let successMessage = `Successfully deleted ${membersToDelete.length} patron(s) from the database.`
    if (authFailures > 0) {
        setFeedback({ type: 'warning', message: `${successMessage} However, ${authFailures} login account(s) could not be found or deleted.`})
    } else {
        setFeedback({ type: 'success', message: `${successMessage} All associated login accounts were also removed.`})
    }

    resetState()
    setLoading(false)
  }

  const resetState = () => {
    setBarcodes('')
    setSelectedBatch('')
    setMembersToDelete([])
    setNotFoundBarcodes([])
    setStep('find')
  }

  // --- REDESIGNED JSX ---
  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-3xl mx-auto">
        <Link href="/members" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Patron Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-2 text-heading-text-black uppercase font-heading tracking-wider">
            Delete Multiple Patrons
          </h1>
          <p className="text-text-grey mb-6 text-sm">Permanently remove multiple patrons, their logins, and all borrowing history.</p>

          {feedback && (
            <div className={clsx("flex items-start gap-3 p-3 rounded-lg text-sm mb-4",
                feedback.type === 'error' && 'bg-red-100 text-red-800',
                feedback.type === 'success' && 'bg-green-100 text-green-800',
                feedback.type === 'warning' && 'bg-yellow-100 text-yellow-800'
            )}>
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5"/>
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {step === 'find' ? (
            // --- Step 1: Find Patrons Form ---
            <form onSubmit={handleFindMembers} className="space-y-4">
              <div className="rounded-xl border border-primary-dark-grey bg-primary-grey p-4">
                <label htmlFor="batch-select" className="block text-sm font-semibold text-text-grey">
                  Delete a whole batch
                </label>
                <p className="mt-1 text-xs leading-5 text-text-grey">
                  Select a batch to automatically place all member barcodes from that batch into the delete box.
                </p>
                <select
                  id="batch-select"
                  value={selectedBatch}
                  onChange={(event) => handleBatchSelect(event.target.value)}
                  disabled={batchLoading}
                  className="mt-3 w-full rounded-lg border border-primary-dark-grey bg-secondary-white p-3 text-sm font-semibold text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                >
                  <option value="">Select batch</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
                {batchLoading && (
                  <p className="mt-2 text-xs font-semibold text-text-grey">Loading batch barcodes...</p>
                )}
              </div>

              <label htmlFor="barcodes" className="block text-sm font-semibold text-text-grey">Enter each barcode on a new line or separated by commas.</label>
              <textarea
                id="barcodes"
                value={barcodes}
                onChange={(e) => setBarcodes(e.target.value)}
                placeholder="e.g.&#10;U445,&#10;U446,&#10;U447"
                className="w-full h-40 p-3 bg-primary-grey font-mono border border-primary-dark-grey rounded-lg text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green transition resize-y"
              />
              <button type="submit" disabled={loading || !barcodes} className="w-full flex items-center justify-center gap-2 bg-dark-green text-white px-8 py-3 rounded-lg font-bold hover:bg-icon-green transition disabled:opacity-60">
                <Search size={18} />
                {loading ? 'Searching...' : 'Find Patrons to Delete'}
              </button>
            </form>
          ) : (
            // --- Step 2: Confirmation View ---
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                <h2 className="mt-2 text-lg font-bold text-red-800">Review & Confirm Deletion</h2>
                <p className="text-sm text-red-700 mt-1">You are about to permanently delete <strong className="font-extrabold">{membersToDelete.length} patron(s)</strong>. This action cannot be undone.</p>
              </div>

              {notFoundBarcodes.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle size={18} className="text-yellow-700 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-yellow-800">Some barcodes were not found:</h3>
                      <p className="text-xs font-mono text-yellow-700 mt-1">{notFoundBarcodes.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto border border-primary-dark-grey rounded-lg p-2 bg-primary-grey">
                <h3 className="font-bold text-heading-text-black px-2">Patrons to be deleted:</h3>
                {membersToDelete.map(member => (
                  <div key={member.id} className="p-2 rounded flex items-center gap-3">
                    <User size={16} className="text-text-grey flex-shrink-0" />
                    <div>
                       <p className="font-semibold text-sm text-heading-text-black">{member.name}</p>
                       <p className="text-xs text-text-grey">Barcode: {member.barcode}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={resetState} disabled={loading} className="w-full bg-secondary-white border border-primary-dark-grey text-text-grey px-8 py-3 rounded-lg font-bold hover:bg-primary-dark-grey transition">
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition">
                  <Trash2 size={18} />
                  {loading ? 'Deleting...' : `Delete ${membersToDelete.length} Patron(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
