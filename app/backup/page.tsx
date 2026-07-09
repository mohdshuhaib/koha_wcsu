'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { Download, AlertTriangle, Trash2, CheckCircle2, X } from 'lucide-react'
import clsx from 'classnames'

// --- Type Definitions ---
type Book = { title: string; author: string; barcode: string; pages: number | null }
type Member = { name: string; batch: string; barcode: string; category: string }

type BorrowRecord = {
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  fine_paid: boolean;
  paid_amount: number;
  books: Book | null;
  members: Member | null;
  member_id: string;
  book_id: string;
}

type PeriodicalRecord = {
  borrow_date: string;
  return_date: string | null;
  issue_identifier: string;
  borrower_name: string;
  periodicals: { name: string } | null;
}

type FinePayment = {
  payment_date: string;
  amount_paid: number;
  notes: string | null;
  borrow_records: {
      fine: number;
      paid_amount: number;
      books: { title: string } | null;
      members: { name: string } | null;
  } | null;
}

type RankedItem = { name: string; count: number; totalPages?: number }

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchAndDownloadBackup = async () => {
    setLoading(true)
    setFeedback({ type: 'info', message: 'Preparing backup... This may take a moment.' })

    try {
      // 1. Fetch all data
      const [
        borrowRecordsRes,
        periodicalRecordsRes,
        finePaymentsRes
      ] = await Promise.all([
        supabase.from('borrow_records').select(`
            borrow_date, due_date, return_date, fine, fine_paid, paid_amount, member_id, book_id,
            books!inner(title, author, barcode, pages),
            members!inner(name, batch, barcode, category)
        `).order('borrow_date', { ascending: false }),
        supabase.from('periodical_records').select(`
            borrow_date, return_date, issue_identifier, borrower_name,
            periodicals!inner(name)
        `).order('borrow_date', { ascending: false }),
        supabase.from('fine_payments').select(`
            payment_date, amount_paid, notes,
            borrow_records!inner(
                fine, paid_amount,
                books!inner(title),
                members!inner(name)
            )
        `).order('payment_date', { ascending: false })
      ]);

      // Type casting to handle potential Supabase type mismatches
      const borrowRecords = borrowRecordsRes.data as unknown as BorrowRecord[] || [];
      const finePayments = finePaymentsRes.data as unknown as FinePayment[] || [];
      const periodicalRecords = periodicalRecordsRes.data as unknown as PeriodicalRecord[] || [];

      // --- 2. Process Borrowing History (Raw Data) ---
      const borrowHistoryData = borrowRecords.map(r => ({
        'Member Name': r.members?.name,
        'Member Barcode': r.members?.barcode,
        'Batch': r.members?.batch,
        'Book Title': r.books?.title,
        'Book Barcode': r.books?.barcode,
        'Pages': r.books?.pages || 0,
        'Borrowed Date': dayjs(r.borrow_date).format('YYYY-MM-DD'),
        'Due Date': dayjs(r.due_date).format('YYYY-MM-DD'),
        'Return Date': r.return_date ? dayjs(r.return_date).format('YYYY-MM-DD') : 'Not Returned',
        'Fine': r.fine,
        'Amount Paid': r.paid_amount,
      }));

      // --- 3. Process "Fine Payments" Sheet ---
      const totalCollected = finePayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const totalOutstanding = borrowRecords
        .filter(r => !r.fine_paid && r.fine > 0)
        .reduce((sum, r) => sum + ((r.fine || 0) - (r.paid_amount || 0)), 0);

      const totalWaived = finePayments
        .filter(p => p.notes?.startsWith('Write-Off'))
        .reduce((sum, p) => {
             const rec = p.borrow_records;
             if (!rec) return sum;
             return sum + ((rec.fine || 0) - (rec.paid_amount || 0));
        }, 0);

      const fineRecordsList = borrowRecords
        .filter(r => r.fine > 0)
        .map(r => ({
            'Member': r.members?.name,
            'Batch': r.members?.batch,
            'Book': r.books?.title,
            'Total': r.fine,
            'Paid': r.paid_amount,
            'Remaining': r.fine - r.paid_amount
        }));

      const finesSheetData = [
        { Member: 'SUMMARY STATS', Batch: '', Book: '', Total: '', Paid: '', Remaining: '' },
        { Member: 'Total Collected', Batch: '', Book: '', Total: totalCollected, Paid: '', Remaining: '' },
        { Member: 'Total Outstanding', Batch: '', Book: '', Total: totalOutstanding, Paid: '', Remaining: '' },
        { Member: 'Total Waived', Batch: '', Book: '', Total: totalWaived, Paid: '', Remaining: '' },
        { Member: '', Batch: '', Book: '', Total: '', Paid: '', Remaining: '' },
        { Member: 'MEMBER', Batch: 'BATCH', Book: 'BOOK', Total: 'TOTAL FINE', Paid: 'PAID', Remaining: 'REMAINING' },
        ...fineRecordsList
      ];

      // --- 4. Calculate Top Stats ---
      const readerStats: Record<string, RankedItem> = {};
      const batchStats: Record<string, RankedItem> = {};
      const bookStats: Record<string, RankedItem> = {};

      borrowRecords.forEach(r => {
        const memberName = r.members?.name || 'Unknown';
        const memberId = r.member_id;
        const batch = r.members?.batch;
        const bookTitle = r.books?.title || 'Unknown';
        const bookId = r.book_id;
        const pages = r.books?.pages || 0;
        const isReturned = !!r.return_date;
        const isStudent = r.members?.category === 'student';

        if (isReturned && isStudent) {
            if (!readerStats[memberId]) readerStats[memberId] = { name: memberName, count: 0, totalPages: 0 };
            readerStats[memberId].count += 1;
            readerStats[memberId].totalPages! += pages;
        }
        if (isReturned && batch && isStudent) {
            if (!batchStats[batch]) batchStats[batch] = { name: batch, count: 0, totalPages: 0 };
            batchStats[batch].count += 1;
            batchStats[batch].totalPages! += pages;
        }
        if (bookTitle) {
            if (!bookStats[bookId]) bookStats[bookId] = { name: bookTitle, count: 0 };
            bookStats[bookId].count += 1;
        }
      });

      const topReadersByBooks = Object.values(readerStats).sort((a, b) => b.count - a.count).slice(0, 5);
      const topReadersByPages = Object.values(readerStats).sort((a, b) => (b.totalPages || 0) - (a.totalPages || 0)).slice(0, 5);
      const topBatchesByBooks = Object.values(batchStats).sort((a, b) => b.count - a.count).slice(0, 5);
      const topBatchesByPages = Object.values(batchStats).sort((a, b) => (b.totalPages || 0) - (a.totalPages || 0)).slice(0, 5);
      const topBooksPopularity = Object.values(bookStats).sort((a, b) => b.count - a.count).slice(0, 5);

      const statsSheetData = [
        { Category: '--- TOP READERS (BY BOOKS READ) ---', Rank: '', Name: '', Count: '', Pages: '' },
        ...topReadersByBooks.map((r, i) => ({ Category: 'Reader (Books)', Rank: i + 1, Name: r.name, Count: r.count, Pages: r.totalPages })),
        { Category: '', Rank: '', Name: '', Count: '', Pages: '' },
        { Category: '--- TOP READERS (BY PAGES READ) ---', Rank: '', Name: '', Count: '', Pages: '' },
        ...topReadersByPages.map((r, i) => ({ Category: 'Reader (Pages)', Rank: i + 1, Name: r.name, Count: r.count, Pages: r.totalPages })),
        { Category: '', Rank: '', Name: '', Count: '', Pages: '' },
        { Category: '--- TOP BATCHES (BY BOOKS READ) ---', Rank: '', Name: '', Count: '', Pages: '' },
        ...topBatchesByBooks.map((r, i) => ({ Category: 'Batch (Books)', Rank: i + 1, Name: r.name, Count: r.count, Pages: r.totalPages })),
        { Category: '', Rank: '', Name: '', Count: '', Pages: '' },
        { Category: '--- TOP BATCHES (BY PAGES READ) ---', Rank: '', Name: '', Count: '', Pages: '' },
        ...topBatchesByPages.map((r, i) => ({ Category: 'Batch (Pages)', Rank: i + 1, Name: r.name, Count: r.count, Pages: r.totalPages })),
        { Category: '', Rank: '', Name: '', Count: '', Pages: '' },
        { Category: '--- MOST POPULAR BOOKS ---', Rank: '', Name: '', Count: '', Pages: '' },
        ...topBooksPopularity.map((r, i) => ({ Category: 'Popular Books', Rank: i + 1, Name: r.name, Count: r.count, Pages: '-' })),
      ];

      // --- 5. Other Sheets ---
      const periodicalsHistoryData = periodicalRecords.map(r => ({
        'Periodical Name': r.periodicals?.name,
        'Issue/Identifier': r.issue_identifier,
        'Borrower Name': r.borrower_name,
        'Borrowed Date': dayjs(r.borrow_date).format('YYYY-MM-DD'),
        'Return Date': r.return_date ? dayjs(r.return_date).format('YYYY-MM-DD') : 'Not Returned'
      }));

      const finePaymentsData = finePayments.map(r => ({
        'Payment Date': dayjs(r.payment_date).format('YYYY-MM-DD HH:mm'),
        'Member Name': r.borrow_records?.members?.name,
        'Book Title': r.borrow_records?.books?.title,
        'Amount Paid': r.amount_paid,
        'Notes': r.notes
      }));

      // 6. Generate Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(borrowHistoryData), 'Borrowing History');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsSheetData), 'Top Stats Summary');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finesSheetData, { skipHeader: true }), 'Fine Payments');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(periodicalsHistoryData), 'Periodicals History');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finePaymentsData), 'Raw Payment Log');

      const fileName = `library_backup_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setFeedback({ type: 'success', message: `Backup downloaded successfully as ${fileName}` });
    } catch (error) {
      console.error('Backup failed:', error);
      setFeedback({ type: 'error', message: 'Failed to create backup. Check the console for details.' });
    } finally {
      setLoading(false);
    }
  }

  const deleteAllRecords = async () => {
    setLoading(true);
    setFeedback({ type: 'info', message: 'Clearing system data...' });

    try {
        // 1. Delete from independent/dependent tables first
        // Note: For BigInt/Int IDs we use .gt('id', 0)
        // For UUIDs we use .neq('id', '00000000-0000-0000-0000-000000000000') to match "all rows"

        // Delete Fine Payments (linked to Borrow Records)
        await supabase.from('fine_payments').delete().gt('id', 0);

        // Delete Hold Records (linked to Books/Members)
        await supabase.from('hold_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete Periodical Records (linked to Periodicals)
        await supabase.from('periodical_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete Holidays
        await supabase.from('holidays').delete().gt('id', 0);

        // Delete Librarians

        // 2. Finally, delete all Borrow Records (Central transaction table)
        const { error: borrowError } = await supabase.from('borrow_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (borrowError) throw borrowError;

        setFeedback({ type: 'success', message: 'System reset complete. All transactional data has been cleared for the new semester.' });
    } catch (error: any) {
        console.error(error);
        setFeedback({ type: 'error', message: `Failed to reset system: ${error.message || 'Unknown error'}` });
    }

    setLoading(false);
    setIsModalOpen(false);
  }

  return (
    <>
      <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
              Library Backup & Reset
            </h1>
            <p className="text-text-grey mt-1">Secure your data or reset for a new semester.</p>
          </div>

          {/* --- Backup Card --- */}
          <div className="bg-secondary-white border border-primary-dark-grey rounded-xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary-grey p-3 rounded-lg"><Download className="text-dark-green" size={24} /></div>
              <div>
                <h2 className="text-xl font-bold font-heading text-heading-text-black">Generate Full Backup</h2>
                <p className="text-sm text-text-grey mt-1 mb-4">
                  Download a comprehensive Excel file containing all borrowing history, periodical records, fine payments, and calculated top statistics.
                </p>
                <button
                  onClick={fetchAndDownloadBackup}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-button-yellow text-button-text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition shadow disabled:opacity-70 disabled:cursor-wait"
                >
                  <Download size={18} />
                  {loading ? 'Generating...' : 'Download Backup'}
                </button>
              </div>
            </div>
          </div>

          {feedback && !loading && (
            <div className={clsx("flex items-start gap-3 p-3 rounded-lg text-sm",
                feedback.type === 'error' && 'bg-red-100 text-red-800',
                feedback.type === 'success' && 'bg-green-100 text-green-800',
                feedback.type === 'info' && 'bg-blue-100 text-blue-800'
            )}>
              {feedback.type === 'success' ? <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5"/> : <AlertTriangle size={20} className="flex-shrink-0 mt-0.5"/>}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {/* --- Danger Zone Card --- */}
          <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-lg"><AlertTriangle className="text-red-600" size={24} /></div>
              <div>
                <h2 className="text-xl font-bold font-heading text-red-800">New Year Reset</h2>
                <p className="text-sm text-red-700 mt-1 mb-4">
                  This action is for starting a fresh academic year. It will <strong>permanently delete</strong>:
                </p>
                <ul className="list-disc list-inside text-xs text-red-800 mb-4 space-y-1 font-semibold">
                    <li>All Borrowing History & Fines</li>
                    <li>All Hold Records</li>
                    <li>All Periodical Borrowing Records</li>
                    <li>Holiday Calendar Settings</li>
                    <li>Librarian User List</li>
                </ul>
                <p className="text-sm text-red-700 mb-4">
                    <strong>Books and Members will remain intact.</strong> Ensure you have downloaded a backup first.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition shadow disabled:opacity-70"
                >
                  <Trash2 size={18} />
                  Reset System Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={deleteAllRecords}
      />
    </>
  )
}

function ConfirmationModal({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState('')
  const requiredText = 'RESET'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-lg w-full border border-primary-dark-grey">
        <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center">
          <h2 className="text-lg font-bold font-heading text-red-700">Confirm System Reset</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-dark-grey"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-grey">
            This action will wipe all transactional data to prepare for a new semester. <strong>Books and Members will NOT be deleted.</strong>
          </p>
          <p className="text-sm text-text-grey">
            To proceed, please type <strong className="text-red-700 font-mono">{requiredText}</strong> into the box below.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-2 border border-primary-dark-grey rounded-md bg-primary-grey text-center font-bold tracking-widest"
            placeholder="Type RESET"
          />
        </div>
        <div className="flex justify-end gap-3 bg-primary-grey p-4 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== requiredText}
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  )
}
