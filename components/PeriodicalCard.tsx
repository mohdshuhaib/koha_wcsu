'use client'

import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffUser, StaffUser } from '@/lib/staff-user'
import dayjs from 'dayjs'
import { Periodical, PeriodicalRecord } from '../app/periodicals/page'
import { ChevronDown, ChevronUp, Edit, Trash2, AlertTriangle, X } from 'lucide-react'
import clsx from 'classnames';

type Props = {
  periodical: Periodical;
  records: PeriodicalRecord[];
  onUpdate: () => void;
  onEdit: () => void;
  onDelete: (periodical: Periodical) => void;
}

// --- Reusable Confirmation Modal ---
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-secondary-white rounded-xl shadow-2xl max-w-sm w-full border border-primary-dark-grey">
                <div className="p-6 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-4 text-xl font-bold font-heading text-heading-text-black">{title}</h3>
                    <p className="mt-2 text-sm text-text-grey">{message}</p>
                </div>
                <div className="flex justify-end gap-3 bg-primary-grey p-4 rounded-b-xl">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-text-grey bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey">Cancel</button>
                    <button onClick={onConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Confirm Delete</button>
                </div>
            </div>
        </div>
    )
}

export default function PeriodicalCard({ periodical, records, onUpdate, onEdit, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [borrowerName, setBorrowerName] = useState('')
  const [issueIdentifier, setIssueIdentifier] = useState('')
  const [borrowDate, setBorrowDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [isAddingRecord, setIsAddingRecord] = useState(false) // State to disable add button
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)

  // State for managing which delete modal is open
  const [modalState, setModalState] = useState<{ type: 'single' | 'all'; recordId?: string } | null>(null)

  useEffect(() => {
    void getCurrentStaffUser().then(setStaffUser)
  }, [])

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!borrowerName || !issueIdentifier) return
    setIsAddingRecord(true); // Disable button on submit

    const { error } = await supabase.from('periodical_records').insert({
      periodical_id: periodical.id,
      borrower_name: borrowerName,
      issue_identifier: issueIdentifier,
      borrow_date: borrowDate,
      created_by_id: staffUser?.id || null,
      created_by_name: staffUser?.displayName || null,
    })
    if (error) console.error(error)
    else {
      setBorrowerName('')
      setIssueIdentifier('')
      onUpdate()
    }
    setIsAddingRecord(false); // Re-enable button
  }

  const handleReturn = async (recordId: string) => {
    const { error } = await supabase.from('periodical_records').update({
      return_date: new Date().toISOString(),
      returned_by_id: staffUser?.id || null,
      returned_by_name: staffUser?.displayName || null,
    }).eq('id', recordId)
    if (error) console.error(error)
    else onUpdate()
  }

  const handleDeleteRecord = async () => {
    if (modalState?.type !== 'single' || !modalState.recordId) return;
    const { error } = await supabase.from('periodical_records').delete().eq('id', modalState.recordId);
    if (error) console.error(error);
    else onUpdate();
    setModalState(null); // Close modal
  };

  const handleDeleteAllRecords = async () => {
    const { error } = await supabase.from('periodical_records').delete().eq('periodical_id', periodical.id);
    if (error) console.error(error);
    else onUpdate();
    setModalState(null); // Close modal
  };

  return (
    <>
      <div className="bg-secondary-white border border-primary-dark-grey rounded-xl shadow-lg transition-all duration-300">
        <div className="flex items-center p-4">
          <img src={periodical.image_url} alt={periodical.name} className="w-16 h-20 object-cover rounded-md flex-shrink-0" />
          <div className="ml-4 flex-grow">
            <h2 className="font-bold text-lg text-heading-text-black">{periodical.name}</h2>
            <p className="text-sm text-text-grey">{periodical.language} - {periodical.type}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEdit} className="p-2 text-text-grey hover:bg-primary-dark-grey rounded-full transition"><Edit size={16} /></button>
            <button onClick={() => onDelete(periodical)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition" title="Delete periodical"><Trash2 size={16} /></button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-text-grey hover:bg-primary-dark-grey rounded-full transition">
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-primary-dark-grey">
            <form onSubmit={handleAddRecord} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-primary-grey">
              <input type="date" value={borrowDate} onChange={e => setBorrowDate(e.target.value)} required className="w-full p-2 border border-primary-dark-grey rounded-md bg-secondary-white" />
              <input type="text" value={issueIdentifier} onChange={e => setIssueIdentifier(e.target.value)} placeholder="Issue No / Date" required className="w-full p-2 border border-primary-dark-grey rounded-md bg-secondary-white" />
              <input type="text" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} placeholder="Borrower Name" required className="w-full p-2 border border-primary-dark-grey rounded-md bg-secondary-white" />
              <button type="submit" disabled={isAddingRecord} className="w-full bg-dark-green text-white font-semibold p-2 rounded-md hover:bg-icon-green transition disabled:opacity-70">
                {isAddingRecord ? 'Saving...' : 'Add Record'}
              </button>
            </form>

            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {records.map(record => (
                <div key={record.id} className="grid grid-cols-4 gap-2 items-center text-sm p-2 rounded-md hover:bg-primary-grey">
                  <p className="text-text-grey">{dayjs(record.borrow_date).format('DD MMM YYYY')}</p>
                  <div>
                    <p className="text-text-grey">{record.issue_identifier}</p>
                    {record.created_by_name && <p className="text-[11px] text-text-grey">Added by {record.created_by_name}</p>}
                    {record.returned_by_name && <p className="text-[11px] text-green-700">Returned by {record.returned_by_name}</p>}
                  </div>
                  <p className="font-semibold text-heading-text-black">{record.borrower_name}</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleReturn(record.id)}
                      disabled={!!record.return_date}
                      className={clsx("px-3 py-1 text-xs font-bold rounded-full transition", record.return_date ? 'bg-green-200 text-green-800 cursor-not-allowed' : 'bg-button-yellow text-button-text-black hover:bg-yellow-500')}
                    >
                      {record.return_date ? `Returned ${dayjs(record.return_date).format('DD/MM')}` : 'Return'}
                    </button>
                     <button onClick={() => setModalState({ type: 'single', recordId: record.id })} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {records.length > 0 && (
                <div className="pt-4 mt-4 border-t border-dashed border-primary-dark-grey flex justify-end">
                    <button onClick={() => setModalState({ type: 'all' })} className="text-xs text-red-600 font-semibold hover:underline">Delete All Records for this Periodical</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalState?.type === 'single'}
        onClose={() => setModalState(null)}
        onConfirm={handleDeleteRecord}
        title="Delete Record?"
        message="Are you sure you want to permanently delete this borrowing record? This action cannot be undone."
      />

      <ConfirmationModal
        isOpen={modalState?.type === 'all'}
        onClose={() => setModalState(null)}
        onConfirm={handleDeleteAllRecords}
        title="Delete All Records?"
        message={`Are you sure you want to delete all ${records.length} records for "${periodical.name}"? This action is irreversible.`}
      />
    </>
  )
}
