'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteBooksWithCleanup } from '@/lib/delete-api-client'
import Link from 'next/link'
import { ArrowLeft, Barcode, Search, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import clsx from 'classnames'

// Define a type for the book data we'll fetch
type BookInfo = {
  id: string;
  title: string;
  author: string;
  barcode: string;
}

export default function DeleteBookPage() {
  const [barcode, setBarcode] = useState('')
  const [bookToDelete, setBookToDelete] = useState<BookInfo | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFindBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode) return
    setLoading(true)
    setFeedback(null)
    setBookToDelete(null)

    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, barcode')
      .eq('barcode', barcode)
      .single()

    if (error || !data) {
      setFeedback({ type: 'error', message: 'No book found with that barcode.' })
    } else {
      setBookToDelete(data as BookInfo)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!bookToDelete) return
    setLoading(true)
    setFeedback(null)

    try {
      await deleteBooksWithCleanup([bookToDelete.id])
      setFeedback({ type: 'success', message: `Successfully deleted "${bookToDelete.title}".` })
      setBookToDelete(null)
      setBarcode('')
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete book.' })
    }
    setLoading(false)
  }

  const cancelDelete = () => {
    setBookToDelete(null)
    setFeedback(null)
  }

  // --- REDESIGNED JSX ---
  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-xl mx-auto">
        <Link href="/books" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Book Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-6 text-heading-text-black uppercase font-heading tracking-wider">
            Delete a Book
          </h1>

          {feedback && (
            <div className={clsx("flex items-center gap-3 p-3 rounded-lg text-sm mb-4", feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>
              {feedback.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {!bookToDelete ? (
            // --- Step 1: Find Book Form ---
            <form onSubmit={handleFindBook} className="space-y-4">
              <label htmlFor="barcode" className="block text-sm font-semibold text-text-grey">Enter the barcode of the book you wish to delete.</label>
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
                {loading ? 'Searching...' : 'Find Book'}
              </button>
            </form>
          ) : (
            // --- Step 2: Confirmation View ---
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                <h2 className="mt-2 text-lg font-bold text-red-800">Confirm Deletion</h2>
                <p className="text-sm text-red-700 mt-1">
                  You are about to permanently delete the following book. This action cannot be undone.
                </p>
              </div>
              <div className="p-4 border border-primary-dark-grey rounded-lg bg-primary-grey space-y-1">
                <p className="text-sm text-text-grey">Title</p>
                <p className="font-bold text-lg text-heading-text-black">{bookToDelete.title}</p>
                <p className="text-sm text-text-grey pt-2">Author</p>
                <p className="font-semibold text-heading-text-black">{bookToDelete.author}</p>
                 <p className="text-sm text-text-grey pt-2">Barcode</p>
                <p className="font-mono text-heading-text-black">{bookToDelete.barcode}</p>
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
