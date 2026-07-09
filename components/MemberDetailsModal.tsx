'use client'

import { ReactNode, useState } from 'react'
import dayjs from 'dayjs'
import { X, BookOpen, IndianRupee, Info, Calendar, Check, Clock } from 'lucide-react'
import clsx from 'classnames'
import { HistoryRecord } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  memberDetails: {
    name: string
    booksRead: number
    pendingFines: number
    returned: HistoryRecord[]
    notReturned: HistoryRecord[]
  } | null
  loading: boolean
}

export default function MemberDetailsModal({ isOpen, onClose, memberDetails, loading }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-primary-dark-grey" onClick={e => e.stopPropagation()}>

        {loading || !memberDetails ? (
          <div className="p-8 text-center">Loading details...</div>
        ) : (
          <>
            <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center">
              <h2 className="text-xl font-bold text-heading-text-black">{memberDetails.name}'s History</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-dark-grey"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="Books Read" value={memberDetails.booksRead} icon={<BookOpen className="text-blue-500" />} />
                <StatCard label="Pending Fines" value={`₹${memberDetails.pendingFines}`} icon={<IndianRupee className="text-red-500" />} />
              </div>

              <div className="space-y-4">
                <RecordList title="Not Returned" records={memberDetails.notReturned} isReturned={false} />
                <RecordList title="Returned History" records={memberDetails.returned} isReturned={true} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="bg-primary-grey rounded-lg p-4 flex items-center gap-4 border border-primary-dark-grey">
      <div className="bg-secondary-white p-3 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-text-grey font-semibold">{label}</p>
        <p className="text-2xl font-bold text-heading-text-black">{value}</p>
      </div>
    </div>
  )
}

function RecordList({ title, records, isReturned }: { title: string; records: HistoryRecord[]; isReturned: boolean }) {
  return (
    <div>
      <h3 className={clsx("text-lg font-bold mb-3", isReturned ? 'text-green-700' : 'text-red-700')}>{title}</h3>
      <div className="space-y-3 text-sm">
        {records.length === 0 ? <p className="text-text-grey p-3 bg-primary-grey rounded">No records.</p> : (
          records.map((r) => <HistoryItem key={r.id} record={r} isReturned={isReturned} />)
        )}
      </div>
    </div>
  )
}

function HistoryItem({ record, isReturned }: { record: HistoryRecord, isReturned: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="border-b border-primary-dark-grey pb-3 last:border-b-0 relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
       <div className="flex items-center gap-2 cursor-help">
         <p className="font-semibold text-heading-text-black hover:text-blue-600 transition-colors">
           {record.books?.title || 'Unknown Book'}
         </p>
         <Info size={14} className="text-text-grey opacity-50 group-hover:opacity-100" />
      </div>

      {showTooltip && record.books && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
           <div className="space-y-1">
             <p><span className="font-bold text-gray-400">Author:</span> {record.books.author || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Pages:</span> {record.books.pages || '-'}</p>
             <p><span className="font-bold text-gray-400">Publication:</span> {record.books.publication || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Edition:</span> {record.books.edition || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Price:</span> {record.books.price != null ? `₹${record.books.price}` : '-'}</p>
           </div>
           <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-grey mt-1">
        <span><Calendar size={12} className="inline mr-1" /><strong>Borrowed:</strong> {dayjs(record.borrow_date).format('DD MMM YYYY')}</span>
        {isReturned ? (
            <span><Check size={12} className="inline mr-1" /><strong>Returned:</strong> {dayjs(record.return_date).format('DD MMM YYYY')}</span>
        ) : (
            <span><Clock size={12} className="inline mr-1" /><strong>Due:</strong> {dayjs(record.due_date).format('DD MMM YYYY')}</span>
        )}
      </div>
    </div>
  )
}
