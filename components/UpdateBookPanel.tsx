'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X, Search, Barcode, CheckCircle2, AlertCircle, Save,
  AlertTriangle
} from 'lucide-react'
import clsx from 'classnames'

// The component's props remain the same
interface Props {
  showSidebar: boolean;
  setShowSidebar: (val: boolean) => void;
}

// ✅ UPDATED: Added 'pages' to the BookData interface
interface BookData {
  id: string;
  title: string;
  author: string;
  language: string;
  call_number: string;
  barcode: string;
  status: string;
  pages: number | null; // Can be a number or null
  price: number | null;
  edition: string | null;
  publication: string | null;
}

export default function UpdateBookPanel({ showSidebar, setShowSidebar }: Props) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSidebar) {
      setTimeout(() => barcodeRef.current?.focus(), 100)
    }
  }, [showSidebar])

  const resetForm = () => {
    setBarcodeInput('')
    setBook(null)
    setFeedback(null)
    setLoading(false)
  }

  const handleClose = () => {
    resetForm()
    setShowSidebar(false)
  }

  const handleFindBook = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    setLoading(true)
    setFeedback(null)
    setBook(null)

    const { data, error } = await supabase.from('books').select('*').eq('barcode', barcodeInput).single()

    if (error || !data) {
      setFeedback({ type: 'error', message: 'No book found with that barcode.' })
    } else {
      setBook(data as BookData)
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!book) return
    setLoading(true)
    setFeedback(null)

    // ✅ UPDATED: Include 'pages' in the data to be updated
    const { error } = await supabase
      .from('books')
      .update({
        title: book.title,
        author: book.author,
        call_number: book.call_number,
        status: book.status,
        pages: book.pages, // Add the pages field here
        price: book.price,
        edition: book.edition,
        publication: book.publication,
      })
      .eq('id', book.id)

    if (error) {
      setFeedback({ type: 'error', message: `Failed to update book: ${error.message}` })
    } else {
      setFeedback({ type: 'success', message: 'Book updated successfully!' })
    }
    setLoading(false)
  }

  if (!showSidebar) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-lg w-full border border-primary-dark-grey">
        <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center">
          <h2 className="text-lg font-bold font-heading">Update Book Details</h2>
          <button onClick={handleClose} className="p-1 rounded-full text-text-grey hover:bg-primary-dark-grey hover:text-red-500 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {feedback && (
            <div className={clsx("flex items-start gap-3 p-3 rounded-lg text-sm mb-4", feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>
              {feedback.type === 'error' ? <AlertTriangle size={20} className="flex-shrink-0 mt-0.5"/> : <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5"/>}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {!book ? (
            <form onSubmit={handleFindBook} className="space-y-4">
              <label htmlFor="barcode-search" className="block text-sm font-semibold text-text-grey">Enter a barcode to find and edit a book.</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Barcode className="h-5 w-5 text-text-grey" /></div>
                <input
                  ref={barcodeRef}
                  id="barcode-search"
                  type="text"
                  placeholder="Scan or type barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full p-3 pl-12 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
              <button type="submit" disabled={loading || !barcodeInput} className="w-full flex items-center justify-center gap-2 bg-dark-green text-white px-8 py-3 rounded-lg font-bold hover:bg-icon-green transition disabled:opacity-60">
                <Search size={18} />
                {loading ? 'Searching...' : 'Find Book'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-text-grey">Title</label>
                  <input type="text" value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Author</label>
                  <input type="text" value={book.author} onChange={(e) => setBook({ ...book, author: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Language</label>
                  <input type="text" value={book.language} readOnly className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-gray-200 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Call Number</label>
                  <input type="text" value={book.call_number} onChange={(e) => setBook({ ...book, call_number: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Price</label>
                  <input type="number" min="0" step="0.01" value={book.price || ''} onChange={(e) => setBook({ ...book, price: e.target.value ? Number(e.target.value) : null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Edition</label>
                  <input type="text" value={book.edition || ''} onChange={(e) => setBook({ ...book, edition: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Publication</label>
                  <input type="text" value={book.publication || ''} onChange={(e) => setBook({ ...book, publication: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>

                {/* ✅ NEW: Pages Input Field */}
                <div>
                  <label className="text-sm font-semibold text-text-grey">Pages</label>
                  <input
                    type="number"
                    value={book.pages || ''}
                    onChange={(e) => setBook({ ...book, pages: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-text-grey">Status</label>
                  <select value={book.status} onChange={(e) => setBook({ ...book, status: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey appearance-none">
                    <option value="available">Available</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="held">Held</option>
                    <option value="lost">Lost</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={resetForm} className="px-5 py-2 text-sm font-semibold bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey">Find Another</button>
                <button onClick={handleUpdate} disabled={loading} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-dark-green rounded-lg hover:bg-icon-green disabled:opacity-70">
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
