'use client'

import { HistoryRecord } from '@/types'
import dayjs from 'dayjs'
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Props {
  records: HistoryRecord[]
  onDelete: (record: HistoryRecord) => void
  onMemberClick: (memberId: string, memberName: string) => void
}

export default function HistoryTable({ records, onDelete, onMemberClick }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'returned' | 'borrowed' | 'overdue'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const getStatus = (record: HistoryRecord) => {
    if (record.return_date) return 'returned'
    if (dayjs().isAfter(dayjs(record.due_date), 'day')) return 'overdue'
    return 'borrowed'
  }

  const filtered = records.filter(r => {
    const matchesSearch =
      (r.members?.name || 'Unknown').toLowerCase().includes(search.toLowerCase()) ||
      (r.books?.title || 'Unknown').toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || getStatus(r) === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Reset page on search
  if (search && page > 1 && paginated.length === 0 && filtered.length > 0) setPage(1)

  return (
    <div className="bg-secondary-white border border-primary-dark-grey rounded-xl p-6 shadow-lg">
      <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Search className="h-5 w-5 text-text-grey" /></div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search history..."
            className="w-full p-3 pl-12 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter)
            setPage(1)
          }}
          className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 text-sm font-bold text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
          aria-label="Filter transaction status"
        >
          <option value="all">All Status</option>
          <option value="returned">Returned</option>
          <option value="borrowed">Borrowed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary-light-black text-white">
            <tr>
              <th className="p-3 text-left font-semibold">Member</th>
              <th className="p-3 text-left font-semibold">Book</th>
              <th className="p-3 text-left font-semibold">Borrowed</th>
              <th className="p-3 text-left font-semibold">Due</th>
              <th className="p-3 text-left font-semibold">Status</th>
              <th className="p-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id} className="border-b border-primary-dark-grey hover:bg-primary-grey transition">
                <td className="p-3">
                  <button
                    onClick={() => r.members && onMemberClick(r.member_id, r.members.name)}
                    className="text-heading-text-black font-bold hover:text-blue-600 hover:underline text-left"
                  >
                    {r.members?.name || 'N/A'}
                  </button>
                </td>
                <td className="p-3 text-text-grey font-malayalam">{r.books?.title || 'N/A'}</td>
                <td className="p-3 text-text-grey">{dayjs(r.borrow_date).format('DD MMM YY')}</td>
                <td className="p-3 text-text-grey">{dayjs(r.due_date).format('DD MMM YY')}</td>
                <td className="p-3">
                    {r.return_date ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Returned</span>
                    ) : dayjs().isAfter(dayjs(r.due_date), 'day') ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Overdue</span>
                    ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">Borrowed</span>
                    )}
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => onDelete(r)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-md bg-button-yellow hover:bg-yellow-500 disabled:opacity-50"><ChevronLeft size={20}/></button>
            <span className="text-text-grey font-medium">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-md bg-button-yellow hover:bg-yellow-500 disabled:opacity-50"><ChevronRight size={20}/></button>
        </div>
      )}
    </div>
  )
}
