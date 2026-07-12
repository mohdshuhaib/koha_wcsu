'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteBooksWithCleanup } from '@/lib/delete-api-client'
import Link from 'next/link'
import {
  ArrowLeft, Search, Trash2, AlertTriangle, CheckCircle2, XCircle, Book
} from 'lucide-react'
import clsx from 'classnames'

type BookInfo = {
  id: string;
  title: string;
  author: string;
  barcode: string;
}

export default function DeleteMultipleBooks() {
  const [barcodes, setBarcodes] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // State for the two-step process
  const [step, setStep] = useState<'find' | 'confirm'>('find')
  const [booksToDelete, setBooksToDelete] = useState<BookInfo[]>([])
  const [notFoundBarcodes, setNotFoundBarcodes] = useState<string[]>([])

  const handleFindBooks = async (e: React.FormEvent) => {
    e.preventDefault()
    const barcodeList = barcodes.split(/[\n,]+/).map((b) => b.trim()).filter(Boolean)

    if (barcodeList.length === 0) {
      setFeedback({ type: 'error', message: 'Please enter at least one barcode.' })
      return
    }

    setLoading(true)
    setFeedback(null)

    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, barcode')
      .in('barcode', barcodeList)

    if (error) {
      setFeedback({ type: 'error', message: `An error occurred: ${error.message}` })
      setLoading(false)
      return
    }

    const foundBarcodes = new Set(data.map(b => b.barcode));
    const notFound = barcodeList.filter(b => !foundBarcodes.has(b));

    setBooksToDelete(data as BookInfo[])
    setNotFoundBarcodes(notFound)

    if (data.length > 0) {
      setStep('confirm')
    } else {
      setFeedback({ type: 'error', message: 'No books were found matching the provided barcodes.' })
    }
    setLoading(false)
  }

  const handleBulkDelete = async () => {
    if (booksToDelete.length === 0) return
    setLoading(true)
    setFeedback(null)

    const bookIds = booksToDelete.map(b => b.id)

    try {
      const result = await deleteBooksWithCleanup(bookIds)
      setFeedback({ type: 'success', message: `Successfully deleted ${result.deletedCount} book(s) and related records.` })
      resetState()
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Deletion failed.' })
    }
    setLoading(false)
  }

  const resetState = () => {
    setBarcodes('')
    setBooksToDelete([])
    setNotFoundBarcodes([])
    setStep('find')
  }

  // --- REDESIGNED JSX ---
  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-3xl mx-auto">
        <Link href="/books" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Book Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-2 text-heading-text-black uppercase font-heading tracking-wider">
            Delete Multiple Books
          </h1>
          <p className="text-text-grey mb-6 text-sm">Use this tool to permanently remove multiple books and their borrowing history from the catalog.</p>

          {feedback && (
            <div className={clsx("flex items-start gap-3 p-3 rounded-lg text-sm mb-4", feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>
              {feedback.type === 'error' ? <AlertTriangle size={20} className="flex-shrink-0 mt-0.5"/> : <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5"/>}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {step === 'find' ? (
            // --- Step 1: Find Books Form ---
            <form onSubmit={handleFindBooks} className="space-y-4">
              <label htmlFor="barcodes" className="block text-sm font-semibold text-text-grey">Enter each barcode on a new line or separated by commas.</label>
              <textarea
                id="barcodes"
                value={barcodes}
                onChange={(e) => setBarcodes(e.target.value)}
                placeholder="e.g.&#10;6141,&#10;5864,&#10;45"
                className="w-full h-40 p-3 bg-primary-grey font-mono border border-primary-dark-grey rounded-lg text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green transition resize-y"
              />
              <button type="submit" disabled={loading || !barcodes} className="w-full flex items-center justify-center gap-2 bg-dark-green text-white px-8 py-3 rounded-lg font-bold hover:bg-icon-green transition disabled:opacity-60">
                <Search size={18} />
                {loading ? 'Searching...' : 'Find Books to Delete'}
              </button>
            </form>
          ) : (
            // --- Step 2: Confirmation View ---
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                <h2 className="mt-2 text-lg font-bold text-red-800">Review & Confirm Deletion</h2>
                <p className="text-sm text-red-700 mt-1">You are about to permanently delete <strong className="font-extrabold">{booksToDelete.length} book(s)</strong>. This action cannot be undone.</p>
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
                <h3 className="font-bold text-heading-text-black px-2">Books to be deleted:</h3>
                {booksToDelete.map(book => (
                  <div key={book.id} className="p-2 rounded flex items-center gap-3">
                    <Book size={16} className="text-text-grey flex-shrink-0" />
                    <div>
                       <p className="font-semibold text-sm text-heading-text-black">{book.title}</p>
                       <p className="text-xs text-text-grey">Barcode: {book.barcode}</p>
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
                  {loading ? 'Deleting...' : `Delete ${booksToDelete.length} Book(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
