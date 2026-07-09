'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import { Award, Book, Users, Download, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

// Components
import LeaderboardCard from '@/components/history/LeaderboardCard'
import HistoryTable from '@/components/history/HistoryTable'
import DateFilter from '@/components/history/DateFilter'
import MemberDetailsModal from '@/components/MemberDetailsModal'
import { HistoryRecord, RankedItem, Member } from '@/types'

dayjs.extend(isBetween)

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filter State
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })

  // Modal States
  const [recordToDelete, setRecordToDelete] = useState<HistoryRecord | null>(null)
  const [selectedMember, setSelectedMember] = useState<{id: string, name: string} | null>(null)
  const [memberDetails, setMemberDetails] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Computed Stats
  const [topReaders, setTopReaders] = useState<RankedItem[]>([])
  const [topBooks, setTopBooks] = useState<RankedItem[]>([])
  const [topBatches, setTopBatches] = useState<RankedItem[]>([])

  useEffect(() => {
    fetchData()
  }, [dateRange]) // Re-fetch when date range changes

  const fetchData = async () => {
    setLoading(true)
    let query = supabase
      .from('borrow_records')
      .select(`
        *,
        members!inner(name, batch, category),
        books!inner(title, barcode, author, pages, price, edition, publication)
      `)
      .order('borrow_date', { ascending: false })

    // Apply Date Filter
    if (dateRange.from) {
      const fromStr = dayjs(dateRange.from).startOf('day').toISOString()
      query = query.gte('borrow_date', fromStr)
    }
    if (dateRange.to) {
      const toStr = dayjs(dateRange.to).endOf('day').toISOString()
      query = query.lte('borrow_date', toStr)
    }

    const { data, error } = await query

    if (!error && data) {
      setRecords(data as any)
      calculateStats(data)
    }
    setLoading(false)
  }

  const calculateStats = (data: any[]) => {
    // 1. Top Readers (Count returned books & pages)
    const readerStats: Record<string, RankedItem> = {}

    // 2. Top Batches (Count returned books & pages)
    const batchStats: Record<string, RankedItem> = {}

    // 3. Top Books (Count all checkouts within period)
    const bookStats: Record<string, RankedItem> = {}

    data.forEach(r => {
      const memberName = r.members?.name
      const memberId = r.member_id
      const batch = r.members?.batch
      const bookTitle = r.books?.title
      const bookId = r.book_id
      const pages = r.pages_read || 0
      const isReturned = !!r.return_date

      // -- Top Readers Logic (Only Returned) --
      if (isReturned && memberName && r.members?.category === 'student') {
        if (!readerStats[memberId]) readerStats[memberId] = { name: memberName, count: 0, totalPages: 0 }
        readerStats[memberId].count += 1
        readerStats[memberId].totalPages! += pages
      }

      // -- Top Batches Logic (Only Returned) --
      if (isReturned && batch && r.members?.category === 'student') {
         if (!batchStats[batch]) batchStats[batch] = { name: batch, count: 0, totalPages: 0 }
         batchStats[batch].count += 1
         batchStats[batch].totalPages! += pages
      }

      // -- Top Books Logic (All Checkouts) --
      if (bookTitle) {
         if (!bookStats[bookId]) bookStats[bookId] = { name: bookTitle, count: 0 }
         bookStats[bookId].count += 1
      }
    })

    setTopReaders(Object.values(readerStats))
    setTopBatches(Object.values(batchStats))
    setTopBooks(Object.values(bookStats))
  }

  const handleDownloadReport = () => {
    const wb = XLSX.utils.book_new();

    // Helper to sort desc
    const sortFn = (a: any, b: any, key: string) => b[key] - a[key];

    // 1. Readers Sheet
    const readersData = topReaders.sort((a,b) => b.count - a.count).map(r => ({
        Name: r.name,
        'Books Read': r.count,
        'Pages Read': r.totalPages
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readersData), "Top Readers");

    // 2. Batches Sheet
    const batchesData = topBatches.sort((a,b) => b.count - a.count).map(b => ({
        Batch: b.name,
        'Books Read': b.count,
        'Pages Read': b.totalPages
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(batchesData), "Top Batches");

    // 3. Books Sheet
    const booksData = topBooks.sort((a,b) => b.count - a.count).map(b => ({
        Title: b.name,
        'Times Borrowed': b.count
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(booksData), "Top Books");

    // 4. Raw Data
    const rawData = records.map(r => ({
        Member: r.members?.name,
        Batch: r.members?.batch,
        Book: r.books?.title,
        Borrowed: dayjs(r.borrow_date).format('YYYY-MM-DD'),
        Returned: r.return_date ? dayjs(r.return_date).format('YYYY-MM-DD') : 'Pending',
        'Checked Out By': r.checkout_by_name || '',
        'Checked In By': r.checkin_by_name || '',
        'Renewed By': r.renewal_by_name || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawData), "Raw Data");

    const dateStr = dateRange.from ? `${dayjs(dateRange.from).format('MMM-DD')}_to_${dateRange.to ? dayjs(dateRange.to).format('MMM-DD') : 'Now'}` : 'All_Time';
    XLSX.writeFile(wb, `Library_Report_${dateStr}.xlsx`);
  }

  // Handle Member Click (Reuse Logic)
  const onMemberClick = async (memberId: string, memberName: string) => {
    setSelectedMember({ id: memberId, name: memberName });
    setDetailLoading(true);

    const { data } = await supabase
        .from('borrow_records')
        .select('*, books(title, barcode, author, pages, price, edition, publication)')
        .eq('member_id', memberId)
        .order('borrow_date', { ascending: false })

    if(data) {
        const returned = data.filter(r => r.return_date)
        const notReturned = data.filter(r => !r.return_date)
        const pendingFines = notReturned.reduce((acc, r) => acc + (r.fine_paid ? 0 : r.fine || 0), 0)
        setMemberDetails({ name: memberName, booksRead: returned.length, pendingFines, returned, notReturned })
    }
    setDetailLoading(false)
  }

  const handleDelete = async () => {
    if (!recordToDelete) return
    const { error } = await supabase.from('borrow_records').delete().eq('id', recordToDelete.id)
    if (!error) setRecords(prev => prev.filter(r => r.id !== recordToDelete.id))
    setRecordToDelete(null)
  }

  return (
    <>
      <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
                Library Analytics
              </h1>
              <p className="text-text-grey mt-1">Analysis based on {dateRange.from ? 'selected date range' : 'all-time records'}.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <DateFilter dateRange={dateRange} setDateRange={setDateRange} />
                <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md"
                >
                    <Download size={18} /> Export Report
                </button>
            </div>
          </div>

          {loading ? <div className="p-20"><Loading /></div> : (
             <>
                {/* Top Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    <LeaderboardCard
                        title="Top Readers"
                        icon={<Award className="text-yellow-500" />}
                        data={topReaders}
                        unit="books"
                        showPagesToggle={true}
                    />
                    <LeaderboardCard
                        title="Top Batches"
                        icon={<Users className="text-purple-500" />}
                        data={topBatches}
                        unit="books"
                        showPagesToggle={true}
                    />
                     <LeaderboardCard
                        title="Top Books"
                        icon={<Book className="text-blue-500" />}
                        data={topBooks}
                        unit="times"
                    />
                </div>

                {/* Main History Table */}
                <HistoryTable
                    records={records}
                    onDelete={setRecordToDelete}
                    onMemberClick={onMemberClick}
                />
             </>
          )}
        </div>
      </div>

      {/* Modals */}
      <MemberDetailsModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        memberDetails={memberDetails}
        loading={detailLoading}
      />

      {recordToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-secondary-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center border border-primary-dark-grey">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-heading-text-black">Delete Record?</h3>
                <p className="text-text-grey mt-2 text-sm">This action cannot be undone.</p>
                <div className="flex gap-3 justify-center mt-6">
                    <button onClick={() => setRecordToDelete(null)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold text-text-grey hover:bg-gray-300">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Delete</button>
                </div>
            </div>
          </div>
      )}
    </>
  )
}
