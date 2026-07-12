'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteMembersWithCleanup } from '@/lib/delete-api-client'
import Link from 'next/link'
import { ArrowLeft, Barcode, Search, Trash2, AlertTriangle } from 'lucide-react'
import clsx from 'classnames'

// Define a type for the member data
type MemberInfo = {
  id: string;
  name: string;
  barcode: string;
  batch: string;
}

export default function DeleteMemberPage() {
  const [barcode, setBarcode] = useState('')
  const [memberToDelete, setMemberToDelete] = useState<MemberInfo | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning', message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFindMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode) return
    setLoading(true)
    setFeedback(null)
    setMemberToDelete(null)

    const { data, error } = await supabase
      .from('members')
      .select('id, name, barcode, batch')
      .eq('barcode', barcode)
      .single()

    if (error || !data) {
      setFeedback({ type: 'error', message: 'No patron found with that barcode.' })
    } else {
      setMemberToDelete(data as MemberInfo)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!memberToDelete) return
    setLoading(true)
    setFeedback(null)

    try {
      const result = await deleteMembersWithCleanup([memberToDelete.id])
      const releaseText = result.releasedBookCount > 0
        ? ` ${result.releasedBookCount} active borrowed/held book(s) were made available.`
        : ''
      const authText = result.authFailures > 0
        ? ' The patron data was deleted, but the login account could not be found or removed.'
        : ' Their login account was also removed.'
      setFeedback({ type: result.authFailures > 0 ? 'warning' : 'success', message: `Successfully deleted "${memberToDelete.name}" and all related records.${releaseText}${authText}` })
      setMemberToDelete(null)
      setBarcode('')
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete patron.' })
      setLoading(false)
      return
    }
    setLoading(false)
  }

  const cancelDelete = () => {
    setMemberToDelete(null)
    setFeedback(null)
  }

  // --- REDESIGNED JSX ---
  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-xl mx-auto">
        <Link href="/members" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Patron Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-6 text-heading-text-black uppercase font-heading tracking-wider">
            Delete a Patron
          </h1>

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

          {!memberToDelete ? (
            // --- Step 1: Find Patron Form ---
            <form onSubmit={handleFindMember} className="space-y-4">
              <label htmlFor="barcode" className="block text-sm font-semibold text-text-grey">Enter the barcode of the patron you wish to delete.</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Barcode className="h-5 w-5 text-text-grey" /></div>
                <input
                  id="barcode"
                  type="text"
                  placeholder="Scan or type barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-3 pl-12 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
              <button type="submit" disabled={loading || !barcode} className="w-full flex items-center justify-center gap-2 bg-dark-green text-white px-8 py-3 rounded-lg font-bold hover:bg-icon-green transition disabled:opacity-60">
                <Search size={18} />
                {loading ? 'Searching...' : 'Find Patron'}
              </button>
            </form>
          ) : (
            // --- Step 2: Confirmation View ---
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                <h2 className="mt-2 text-lg font-bold text-red-800">Confirm Deletion</h2>
                <p className="text-sm text-red-700 mt-1">
                  You are about to permanently delete this patron, their login, and all their borrowing history. This action cannot be undone.
                </p>
              </div>
              <div className="p-4 border border-primary-dark-grey rounded-lg bg-primary-grey space-y-1">
                <p className="text-sm text-text-grey">Name</p>
                <p className="font-bold text-lg text-heading-text-black">{memberToDelete.name}</p>
                <p className="text-sm text-text-grey pt-2">Batch</p>
                <p className="font-semibold text-heading-text-black">{memberToDelete.batch}</p>
                 <p className="text-sm text-text-grey pt-2">Barcode</p>
                <p className="font-mono text-heading-text-black">{memberToDelete.barcode}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={cancelDelete} disabled={loading} className="w-full bg-secondary-white border border-primary-dark-grey text-text-grey px-8 py-3 rounded-lg font-bold hover:bg-primary-dark-grey transition">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition">
                  <Trash2 size={18} />
                  {loading ? 'Deleting...' : 'Confirm Deletion'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
