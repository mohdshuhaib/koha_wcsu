'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X, Search, Barcode, CheckCircle2, AlertTriangle, Save
} from 'lucide-react'
import clsx from 'classnames'

// The component's props are updated for clarity but function the same
interface Props {
  showPanel: boolean;
  setShowPanel: (val: boolean) => void;
}

// Type for the Patron data
interface PatronData {
  id: string;
  name: string;
  batch: string;
  category: string;
  barcode: string;
  ph_no: string | null;
  address: string | null;
  dob: string | null;
  email: string | null;
  class: string | null;
  image_link: string | null;
}

export default function UpdatePatronPanel({ showPanel, setShowPanel }: Props) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [patron, setPatron] = useState<PatronData | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  // Focus the input when the modal opens
  useEffect(() => {
    if (showPanel) {
      setTimeout(() => barcodeRef.current?.focus(), 100)
    }
  }, [showPanel])

  const resetForm = () => {
    setBarcodeInput('')
    setPatron(null)
    setFeedback(null)
    setLoading(false)
  }

  const handleClose = () => {
    resetForm()
    setShowPanel(false)
  }

  const handleFindPatron = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    setLoading(true)
    setFeedback(null)
    setPatron(null)

    const { data, error } = await supabase.from('members').select('*').eq('barcode', barcodeInput).single()

    if (error || !data) {
      setFeedback({ type: 'error', message: 'No patron found with that barcode.' })
    } else {
      setPatron(data as PatronData)
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!patron) return
    setLoading(true)
    setFeedback(null)

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
      setFeedback({ type: 'error', message: `Failed to update patron: ${error.message}` })
    } else {
      setFeedback({ type: 'success', message: 'Patron updated successfully!' })
    }
    setLoading(false)
  }

  if (!showPanel) return null

  // --- REDESIGNED JSX ---
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-lg w-full border border-primary-dark-grey">
        <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center">
          <h2 className="text-lg font-bold font-heading">Update Patron Details</h2>
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

          {!patron ? (
            // --- Step 1: Find Patron Form ---
            <form onSubmit={handleFindPatron} className="space-y-4">
              <label htmlFor="barcode-search" className="block text-sm font-semibold text-text-grey">Enter a barcode to find and edit a patron.</label>
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
                {loading ? 'Searching...' : 'Find Patron'}
              </button>
            </form>
          ) : (
            // --- Step 2: Edit Form ---
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-text-grey">Name</label>
                  <input type="text" value={patron.name} onChange={(e) => setPatron({ ...patron, name: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Batch</label>
                  <input type="text" value={patron.batch} onChange={(e) => setPatron({ ...patron, batch: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Category</label>
                  <select value={patron.category} onChange={(e) => setPatron({ ...patron, category: e.target.value })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey">
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="class">class</option>
                    <option value="outside">outsider</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-text-grey">Barcode</label>
                  <input type="text" value={patron.barcode} readOnly className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-gray-200 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Phone Number</label>
                  <input type="text" value={patron.ph_no || ''} onChange={(e) => setPatron({ ...patron, ph_no: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Email</label>
                  <input type="email" value={patron.email || ''} onChange={(e) => setPatron({ ...patron, email: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Date of Birth</label>
                  <input type="date" value={patron.dob || ''} onChange={(e) => setPatron({ ...patron, dob: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-text-grey">Class</label>
                  <input type="text" value={patron.class || ''} onChange={(e) => setPatron({ ...patron, class: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-text-grey">Address</label>
                  <input type="text" value={patron.address || ''} onChange={(e) => setPatron({ ...patron, address: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-text-grey">Image Drive Link</label>
                  <input type="text" value={patron.image_link || ''} onChange={(e) => setPatron({ ...patron, image_link: e.target.value || null })} className="w-full mt-1 p-2 border border-primary-dark-grey rounded-md bg-primary-grey" />
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
