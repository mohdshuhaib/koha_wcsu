'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import dayjs from 'dayjs'
import Loading from '@/app/loading'
import { supabase } from '@/lib/supabase'
import { Search, X, BookOpen, IndianRupee, ChevronLeft, ChevronRight, Eye, ArrowLeft, Download, Calendar, Check, Clock, Printer, Info } from 'lucide-react'
import Link from 'next/link'
import clsx from 'classnames';
import * as XLSX from 'xlsx';

// --- Type Definitions ---
type BorrowRecord = {
  borrow_date: string
  due_date: string
  return_date: string | null
  fine: number
  fine_paid: boolean
  books: {
    title: string
    barcode: string
    author: string        // ✨ Added
    pages: number | null  // ✨ Added
    price: number | null
    edition: string | null
    publication: string | null
  } | null
}

type Member = {
  id: string
  name: string
  barcode: string
  batch: string
  category: string
  ph_no: string | null
  address: string | null
  dob: string | null
  email: string | null
  class: string | null
  image_link: string | null
}

type MemberDetails = {
  name: string
  booksRead: number
  pendingFines: number
  returned: BorrowRecord[]
  notReturned: BorrowRecord[]
}

// --- Main Page Component ---
export default function PatronStatusPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true)
      const { data } = await supabase.from('members').select('*').order('name', { ascending: true })
      if (data) setMembers(data as Member[])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const handleViewDetails = async (member: Member) => {
    setSelectedMember(member)
    setDetailsLoading(true)
    setMemberDetails(null)

    // ✨ UPDATED: Fetch additional book details for the tooltip
    const { data: records } = await supabase
      .from('borrow_records')
      .select('*, books(title, barcode, author, pages, price, edition, publication)')
      .eq('member_id', member.id)
      .order('borrow_date', { ascending: false })

    const returned: BorrowRecord[] = [];
    const notReturned: BorrowRecord[] = [];
    records?.forEach(record => {
        if (record.return_date) returned.push(record);
        else notReturned.push(record);
    });

    const pendingFines = records?.reduce((acc, r) => acc + (r.fine_paid ? 0 : r.fine || 0), 0) || 0

    setMemberDetails({
      name: member.name,
      booksRead: returned.length,
      pendingFines,
      returned,
      notReturned,
    })
    setDetailsLoading(false)
  }

  const handleBatchDownload = async (batch: string) => {
    setDownloadingBatch(batch);
    try {
        const { data: returnedRecords, error: recordsError } = await supabase
            .from('borrow_records')
            .select('member_id')
            .not('return_date', 'is', null);

        if (recordsError) throw recordsError;

        const returnCounts = returnedRecords.reduce((acc: { [key: string]: number }, record) => {
            if (record.member_id) {
                acc[record.member_id] = (acc[record.member_id] || 0) + 1;
            }
            return acc;
        }, {});

        const membersInBatchWithReturns = members.filter(member =>
            member.batch === batch && returnCounts[member.id] > 0
        );

        if (membersInBatchWithReturns.length === 0) {
            alert(`No members in batch "${batch}" have returned any books yet.`);
            return;
        }

        const excelData = membersInBatchWithReturns.map(member => ({
            'Member Name': member.name,
            'Returned Books Count': returnCounts[member.id],
            'Barcode': member.barcode,
            'Phone': member.ph_no || '',
            'Email': member.email || '',
            'Class': member.class || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${batch} Report`);
        XLSX.writeFile(workbook, `returned-books-report-${batch}.xlsx`);

    } catch (error) {
        console.error('Failed to generate report:', error);
        alert('An error occurred while generating the report.');
    } finally {
        setDownloadingBatch(null);
    }
  };

  const handlePrintMemberHistory = (details: MemberDetails) => {
    if (!details || details.returned.length === 0) {
        alert("This member has no returned book history to print.");
        return;
    }
    setIsPrinting(true);

    const excelData = details.returned.map((record, index) => ({
        'SL No': index + 1,
        'Book Name': record.books?.title || 'Unknown Book',
        'Barcode': record.books?.barcode || 'N/A',
        'Borrowed Date': dayjs(record.borrow_date).format('YYYY-MM-DD'),
    }));

    const title = `Book Read List of ${details.name}`;
    const worksheet = XLSX.utils.aoa_to_sheet([[title]]);
    XLSX.utils.sheet_add_json(worksheet, excelData, { origin: 'A2' });

    const objectMaxLength = Object.keys(excelData[0] || {}).map(key => key.length);
    const columnWidths = excelData.reduce((widths, row) => {
        Object.values(row).forEach((value, i) => {
            const len = String(value).length;
            if (widths[i] < len) {
                widths[i] = len;
            }
        });
        return widths;
    }, objectMaxLength);

    if (columnWidths[0] < title.length) {
        columnWidths[0] = title.length;
    }
    worksheet["!cols"] = columnWidths.map(width => ({ wch: width + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reading History');
    const fileName = `${details.name.replace(/\s+/g, '_')}_reading_history.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setIsPrinting(false);
  };

  const closeModal = () => {
    setSelectedMember(null)
    setMemberDetails(null)
  }

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.ph_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.class || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const uniqueBatches = [...Array.from(new Set(members.map(m => m.batch).filter(Boolean)))].sort();

  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredMembers.length / pageSize)

  if (loading) return <Loading />

  return (
    <>
      <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
                Patron Status
              </h1>
              <p className="text-text-grey mt-1">Search for patrons or download batch-wise reports.</p>
            </div>
             <Link href="/members" className="flex items-center gap-2 text-sm font-semibold text-dark-green hover:text-icon-green transition">
               <ArrowLeft size={16} /> Back to Patron Management
            </Link>
          </div>

          <div className="bg-secondary-white border border-primary-dark-grey rounded-xl shadow-lg p-6 mb-6">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Search className="h-5 w-5 text-text-grey" /></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search by name or barcode..."
                className="w-full md:w-1/2 p-3 pl-12 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-primary-dark-grey">
                <h3 className="text-sm font-semibold text-text-grey mb-2">Download Batch Reports:</h3>
                <div className="flex flex-wrap gap-2">
                    {uniqueBatches.map(batch => (
                        <button
                            key={batch}
                            onClick={() => handleBatchDownload(batch)}
                            disabled={downloadingBatch === batch}
                            className="flex items-center gap-2 text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full hover:bg-blue-200 transition disabled:opacity-70 disabled:cursor-wait"
                        >
                            <Download size={14} />
                            {downloadingBatch === batch ? 'Generating...' : batch}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="bg-secondary-white border border-primary-dark-grey rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary-light-black text-white">
                  <tr>
                    <th className="text-left p-3 font-semibold uppercase tracking-wider">Name</th>
                    <th className="text-left p-3 font-semibold uppercase tracking-wider">Barcode</th>
                    <th className="text-left p-3 font-semibold uppercase tracking-wider">Batch/Category</th>
                    <th className="text-left p-3 font-semibold uppercase tracking-wider">Contact</th>
                    <th className="text-center p-3 font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className="border-b border-primary-dark-grey last:border-b-0 hover:bg-primary-grey transition">
                      <td className="p-3 font-semibold text-heading-text-black">{member.name}</td>
                      <td className="p-3 text-text-grey">{member.barcode}</td>
                      <td className="p-3 text-text-grey">
                        <div>{member.batch || member.category}</div>
                        {member.class && <div className="text-xs">Class: {member.class}</div>}
                      </td>
                      <td className="p-3 text-text-grey">
                        <div>{member.ph_no || '-'}</div>
                        {member.email && <div className="text-xs">{member.email}</div>}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleViewDetails(member)} className="flex items-center justify-center gap-2 w-full bg-button-yellow text-button-text-black font-bold px-4 py-1.5 rounded-md hover:bg-yellow-500 transition">
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMembers.length === 0 && <p className="text-center p-6 text-text-grey">No members found.</p>}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-primary-dark-grey">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-md bg-button-yellow text-button-text-black hover:bg-yellow-500 disabled:opacity-60 transition"><ChevronLeft size={20} /></button>
                <span className="text-text-grey font-semibold">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-md bg-button-yellow text-button-text-black hover:bg-yellow-500 disabled:opacity-60 transition"><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DetailsModal isOpen={!!selectedMember} onClose={closeModal}>
        {detailsLoading ? <Loading /> : memberDetails ? (
          <>
            <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center">
                <h2 className="text-xl font-bold text-heading-text-black">{memberDetails.name}'s Status</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePrintMemberHistory(memberDetails)} disabled={isPrinting} className="p-1.5 rounded-full text-text-grey hover:bg-primary-dark-grey disabled:opacity-50" title="Print Reading History">
                        {isPrinting ? <LoadingSpinner/> : <Printer size={18} />}
                    </button>
                    <button onClick={closeModal} className="p-1 rounded-full hover:bg-primary-dark-grey"><X size={20}/></button>
                </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="Books Read" value={memberDetails.booksRead} icon={<BookOpen className="text-blue-500" />} />
                <StatCard label="Pending Fines" value={`₹${memberDetails.pendingFines}`} icon={<IndianRupee className="text-red-500" />} />
              </div>
              <div className="space-y-4">
                <HistoryList title="Not Returned" records={memberDetails.notReturned} isReturnedList={false} />
                <HistoryList title="Returned History" records={memberDetails.returned} isReturnedList={true} />
              </div>
            </div>
          </>
        ) : <p className="p-8 text-center text-red-500">Could not load member details.</p>}
      </DetailsModal>
    </>
  )
}

// --- Helper Components ---

// ✨ NEW: Individual History Item Component to handle tooltip state
function HistoryItem({ record, isReturnedList }: { record: BorrowRecord, isReturnedList: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="border-b border-primary-dark-grey pb-3 last:border-b-0 relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)} // Toggle on click for mobile
    >
      <div className="flex items-center gap-2 cursor-help">
         <p className="font-semibold text-heading-text-black hover:text-blue-600 transition-colors">
           {record.books?.title || 'Unknown Book'}
         </p>
         <Info size={14} className="text-text-grey opacity-50 group-hover:opacity-100" />
      </div>

      {/* Tooltip */}
      {showTooltip && record.books && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
           <div className="space-y-1">
             <p><span className="font-bold text-gray-400">Author:</span> {record.books.author || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Barcode:</span> {record.books.barcode}</p>
             <p><span className="font-bold text-gray-400">Pages:</span> {record.books.pages || '-'}</p>
             <p><span className="font-bold text-gray-400">Publication:</span> {record.books.publication || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Edition:</span> {record.books.edition || 'N/A'}</p>
             <p><span className="font-bold text-gray-400">Price:</span> {record.books.price != null ? `₹${record.books.price}` : '-'}</p>
           </div>
           {/* Arrow */}
           <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-grey mt-1">
        <span><Calendar size={12} className="inline mr-1" /><strong>Borrowed:</strong> {dayjs(record.borrow_date).format('DD MMM YYYY')}</span>
        {isReturnedList ? (
            <span><Check size={12} className="inline mr-1" /><strong>Returned:</strong> {dayjs(record.return_date).format('DD MMM YYYY')}</span>
        ) : (
            <span><Clock size={12} className="inline mr-1" /><strong>Due:</strong> {dayjs(record.due_date).format('DD MMM YYYY')}</span>
        )}
        {record.fine > 0 && (
          <span className={record.fine_paid ? 'text-green-600' : 'text-red-600'}>
            <strong>Fine:</strong> ₹{record.fine} {record.fine_paid ? '(Paid)' : '(Unpaid)'}
          </span>
        )}
      </div>
    </div>
  );
}

function DetailsModal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-primary-dark-grey" onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
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

function HistoryList({ title, records, isReturnedList }: { title: string; records: BorrowRecord[]; isReturnedList: boolean }) {
  return (
    <div>
      <h3 className={clsx("text-lg font-bold mb-3", isReturnedList ? 'text-green-700' : 'text-red-700')}>{title}</h3>
      {/* ✅ FIX: Removed max-h and overflow to allow tooltips to overflow naturally */}
      <div className="space-y-3 text-sm">
        {records.length === 0 ? <p className="text-text-grey text-sm p-4 bg-primary-grey rounded-md">No records in this category.</p> : (
          records.map((record, index) => (
            // ✨ Render the new HistoryItem component
            <HistoryItem key={index} record={record} isReturnedList={isReturnedList} />
          ))
        )}
      </div>
    </div>
  )
}

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-text-grey" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
