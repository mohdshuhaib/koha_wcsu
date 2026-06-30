'use client'

import { useEffect, useState, useMemo, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sendLibraryNotification } from '@/lib/notification-events-client'
import Loading from '../loading'
import dayjs from 'dayjs'
import {
  IndianRupee, Users, History, Printer, CreditCard, Eraser, X, AlertTriangle, Plus, Wallet, TrendingDown
} from 'lucide-react'
import clsx from 'classnames'

// --- Type Definitions ---
type FineRecord = {
  id: number
  fine: number
  paid_amount: number
  return_date: string | null
  fine_paid: boolean
  member: { id: string; name: string; batch: string }
  book: { title: string }
}

type Librarian = {
  id: number
  name: string
}

// Expanded type to include nested borrow_record data for calculations
type PaymentRecord = {
  amount_paid: number
  librarian_name: string | null
  notes: string | null
  borrow_record?: {
      fine: number
      paid_amount: number
  }
}

// --- Main Page Component ---
export default function FinesPage() {
  const [loading, setLoading] = useState(true)
  const [fines, setFines] = useState<FineRecord[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState('All')

  // Stats State
  const [totalCollected, setTotalCollected] = useState(0)
  const [totalWaived, setTotalWaived] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)

  // Librarian State
  const [librarians, setLibrarians] = useState<Librarian[]>([])
  const [selectedLibrarian, setSelectedLibrarian] = useState('')
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([])

  const [modalState, setModalState] = useState<{ type: 'payment' | 'history' | 'writeOff' | null; data: any }>({ type: null, data: null })

  const [paymentAmount, setPaymentAmount] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const router = useRouter()

  // --- Data Fetching and Logic ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setIsLoggedIn(true)
      }
      setCheckingSession(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (isLoggedIn) {
      fetchFines()
      fetchFinancialStats()
      fetchLibrarians()
    }
  }, [isLoggedIn])

  const fetchFines = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('borrow_records')
      .select('id, fine, paid_amount, return_date, fine_paid, member:member_id(id, name, batch), book:book_id(title)')
      .eq('fine_paid', false)
      .gt('fine', 0)

    if (error) console.error(error)
    else setFines(data as any)
    setLoading(false)
  }

  const fetchLibrarians = async () => {
    const { data } = await supabase.from('librarians').select('*').order('name')
    if (data) setLibrarians(data)
  }

  const fetchFinancialStats = async () => {
    // 1. Calculate Total Outstanding (Needed to Collect)
    // This comes from active borrow records where fine_paid is false
    const { data: outstandingRecords } = await supabase
        .from('borrow_records')
        .select('fine, paid_amount')
        .eq('fine_paid', false)
        .gt('fine', 0)

    if (outstandingRecords) {
        const outstanding = outstandingRecords.reduce((sum, r) => sum + ((r.fine || 0) - (r.paid_amount || 0)), 0)
        setTotalOutstanding(outstanding)
    }

    // 2. Calculate Total Collected and Total Waived
    // This comes from the transaction history (fine_payments)
    const { data: payments } = await supabase
        .from('fine_payments')
        .select(`
            amount_paid,
            notes,
            librarian_name,
            borrow_record:borrow_records!inner(fine, paid_amount)
        `)

    if (payments) {
        const typedPayments = payments as unknown as PaymentRecord[];
        setAllPayments(typedPayments)

        // Collected: Sum of amount_paid
        const collected = typedPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)
        setTotalCollected(collected)

        // Waived: Sum of (fine - paid_amount) for transactions marked as Write-Off
        const waived = typedPayments
            .filter(p => p.notes?.startsWith('Write-Off'))
            .reduce((sum, p) => {
                const rec = p.borrow_record;
                if (!rec) return sum;
                // The amount waived is the remaining balance on that record
                return sum + ((rec.fine || 0) - (rec.paid_amount || 0));
            }, 0)

        setTotalWaived(waived)
    }
  }

  const handleAddLibrarian = async (name: string) => {
    if (!name.trim()) return
    const { data, error } = await supabase.from('librarians').insert({ name: name.trim() }).select().single()
    if (!error && data) {
        setLibrarians([...librarians, data])
        setSelectedLibrarian(data.name)
    }
  }

  const handleProcessPayment = async () => {
    const currentFine = modalState.data;
    if (!currentFine || !paymentAmount || !selectedLibrarian) {
        if(!selectedLibrarian) alert("Please select a librarian.")
        return
    }

    const amountToPay = parseInt(paymentAmount, 10)
    const remainingFine = (currentFine.fine || 0) - (currentFine.paid_amount || 0)

    if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > remainingFine) {
      alert('Please enter a valid amount, up to the remaining fine.')
      return
    }

    const { error: logError } = await supabase
      .from('fine_payments')
      .insert({
          borrow_record_id: currentFine.id,
          amount_paid: amountToPay,
          notes: 'Standard Payment',
          librarian_name: selectedLibrarian
      })

    if (logError) {
      console.error(logError);
      alert('Failed to log payment.')
      return
    }

    const newPaidAmount = (currentFine.paid_amount || 0) + amountToPay
    const isFullyPaid = newPaidAmount >= currentFine.fine

    const { error: updateError } = await supabase
      .from('borrow_records')
      .update({
        paid_amount: newPaidAmount,
        fine_paid: isFullyPaid,
      })
      .eq('id', currentFine.id)

    if (updateError) {
      alert('Failed to update fine record.')
    } else {
      void sendLibraryNotification({
        type: 'fine_payment',
        memberId: currentFine.member.id,
        paidAmount: amountToPay,
        totalFine: currentFine.fine,
      })
      fetchFines()
      fetchFinancialStats()
    }
    setModalState({ type: null, data: null })
    setPaymentAmount('')
  }

  const handleWriteOff = async () => {
    const fineRecord = modalState.data;
    if (!fineRecord || !writeOffReason.trim() || !selectedLibrarian) {
        if(!selectedLibrarian) alert("Please select a librarian.")
        else alert('Please provide a reason for writing off the fine.');
        return;
    }

    const { error: logError } = await supabase
        .from('fine_payments')
        .insert({
            borrow_record_id: fineRecord.id,
            amount_paid: 0,
            notes: `Write-Off: ${writeOffReason}`,
            librarian_name: selectedLibrarian
        });

    if (logError) {
        console.error(logError);
        alert('Failed to log the write-off event.');
        return;
    }

    const { error: updateError } = await supabase
      .from('borrow_records')
      .update({ fine_paid: true })
      .eq('id', fineRecord.id)

    if (updateError) {
      alert('Failed to write off fine.')
    } else {
      fetchFines()
      fetchFinancialStats()
    }
    setModalState({ type: null, data: null })
    setWriteOffReason('');
  }

  const fetchPaymentHistory = async () => {
    setModalState({ type: 'history', data: null })
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from('fine_payments')
      .select('id, payment_date, amount_paid, notes, librarian_name, borrow_records(book:book_id(title), member:member_id(name))')
      .order('payment_date', { ascending: false })

    if (data) setPaymentHistory(data)
    setHistoryLoading(false)
  }

  const handlePrint = () => {
    const totalOwed = filteredFines.reduce((sum, f) => sum + (f.fine - (f.paid_amount || 0)), 0);
    const printWindow = window.open('', '_blank', 'width=1100,height=800')

    if (!printWindow) {
      alert('Could not open print report. Please allow popups for this site.')
      return
    }

    printWindow.document.write(createFineReportHtml(filteredFines, selectedBatch, totalOwed))
    printWindow.document.close()
    printWindow.focus()
    printWindow.setTimeout(() => printWindow.print(), 500)
  }

  const openPaymentModal = (fineRecord: FineRecord) => {
    const remaining = (fineRecord.fine || 0) - (fineRecord.paid_amount || 0)
    setPaymentAmount(remaining.toString())
    setModalState({ type: 'payment', data: fineRecord })
  }

  const openWriteOffModal = (fineRecord: FineRecord) => {
    setWriteOffReason('');
    setModalState({ type: 'writeOff', data: fineRecord })
  }

  const uniqueBatches = ['All', ...Array.from(new Set(fines.map(f => f.member?.batch).filter(Boolean)))].sort()
  const filteredFines = selectedBatch === 'All' ? fines : fines.filter(f => f.member?.batch === selectedBatch)
  const patronsWithFines = new Set(filteredFines.map(f => f.member.name)).size

  if (checkingSession || (loading && fines.length === 0 && totalCollected === 0)) return <Loading />
  if (!isLoggedIn) return null

  return (
    <>
      <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">Fine Management</h1>
                    <p className="text-text-grey mt-1">Track collections, outstanding dues, and waivers.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchPaymentHistory} className="flex items-center gap-2 px-4 py-2 bg-secondary-white border border-primary-dark-grey text-text-grey rounded-lg font-semibold text-sm hover:bg-primary-dark-grey transition">
                        <History size={16} /> Payment History
                    </button>
                </div>
            </div>

            {/* --- Financial Stats Dashboard --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                    label="Total Collected"
                    value={`₹${totalCollected.toLocaleString('en-IN')}`}
                    icon={<Wallet className="text-green-600" />}
                    subtext="Total revenue generated"
                    trend="up"
                />
                <StatCard
                    label="Total Outstanding"
                    value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
                    icon={<TrendingDown className="text-red-500" />}
                    subtext="Amount yet to be collected"
                    trend="down"
                />
                <StatCard
                    label="Total Waived (Mercy)"
                    value={`₹${totalWaived.toLocaleString('en-IN')}`}
                    icon={<Eraser className="text-orange-500" />}
                    subtext="Fines written off"
                    trend="neutral"
                />
            </div>

            <div className="bg-secondary-white border border-primary-dark-grey rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-primary-dark-grey pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text-grey mr-2">Filter by Batch:</span>
                        {uniqueBatches.map((batch) => (
                            <button key={batch} onClick={() => setSelectedBatch(batch)} className={clsx('px-3 py-1.5 rounded-full text-xs font-bold transition', selectedBatch === batch ? 'bg-dark-green text-white shadow' : 'bg-primary-dark-grey text-heading-text-black hover:bg-icon-green hover:text-white')}>
                                {batch}
                            </button>
                        ))}
                    </div>
                    <button onClick={handlePrint} disabled={filteredFines.length === 0} className="flex items-center gap-2 px-4 py-2 bg-secondary-light-black text-white rounded-lg font-semibold text-sm hover:bg-heading-text-black transition disabled:opacity-50 w-full md:w-auto">
                        <Printer size={16} /> Print Report
                    </button>
                </div>

                {loading ? <Loading /> : filteredFines.length === 0 ? (
                    <div className="text-center py-10"><h3 className="text-lg font-medium text-heading-text-black">All Clear!</h3><p className="mt-1 text-sm text-text-grey">No unpaid fines found for this batch.</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-secondary-light-black text-white">
                                <tr>
                                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Member</th>
                                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Book</th>
                                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Total</th>
                                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Paid</th>
                                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Remaining</th>
                                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFines.map((f) => {
                                    const remaining = (f.fine || 0) - (f.paid_amount || 0)
                                    return (
                                        <tr key={f.id} className="border-b border-primary-dark-grey last:border-b-0 hover:bg-primary-grey transition">
                                            <td className="p-3"><p className="font-semibold text-heading-text-black">{f.member?.name}</p><p className="text-xs text-text-grey">{f.member?.batch}</p></td>
                                            <td className="p-3 text-text-grey font-malayalam">{f.book?.title}</td>
                                            <td className="p-3 text-center text-text-grey">₹{f.fine}</td>
                                            <td className="p-3 text-center text-green-600 font-semibold">₹{f.paid_amount || 0}</td>
                                            <td className="p-3 text-center text-red-600 font-bold">₹{remaining}</td>
                                            <td className="p-3 text-center space-y-2 md:space-y-0 md:space-x-2">
                                                <button onClick={() => openPaymentModal(f)} className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 transition">
                                                    <CreditCard size={14} /> Pay
                                                </button>
                                                <button onClick={() => openWriteOffModal(f)} className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-yellow-500 text-button-text-black font-semibold hover:bg-yellow-600 transition">
                                                    <Eraser size={14} /> Mercy
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>

      <Modal isOpen={!!modalState.type} onClose={() => setModalState({ type: null, data: null })}>
        {modalState.type === 'payment' && (
            <PaymentContent
                fine={modalState.data}
                amount={paymentAmount}
                setAmount={setPaymentAmount}
                onConfirm={handleProcessPayment}
                onClose={() => setModalState({ type: null, data: null })}
                librarians={librarians}
                selectedLibrarian={selectedLibrarian}
                setSelectedLibrarian={setSelectedLibrarian}
                onAddLibrarian={handleAddLibrarian}
                allPayments={allPayments}
            />
        )}
        {modalState.type === 'history' && (
            <HistoryContent history={paymentHistory} loading={historyLoading} onClose={() => setModalState({ type: null, data: null })} />
        )}
        {modalState.type === 'writeOff' && (
            <WriteOffContent
                fine={modalState.data}
                reason={writeOffReason}
                setReason={setWriteOffReason}
                onConfirm={handleWriteOff}
                onClose={() => setModalState({ type: null, data: null })}
                librarians={librarians}
                selectedLibrarian={selectedLibrarian}
                setSelectedLibrarian={setSelectedLibrarian}
                onAddLibrarian={handleAddLibrarian}
                allPayments={allPayments}
            />
        )}
      </Modal>
    </>
  )
}

function createFineReportHtml(fines: FineRecord[], selectedBatch: string, totalOwed: number) {
  const rows = fines.map((fine, index) => {
    const remaining = (fine.fine || 0) - (fine.paid_amount || 0)
    const bookTitle = fine.book?.title || 'N/A'
    const bookClass = getScriptClass(bookTitle)

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHtml(fine.member?.name || 'N/A')}</strong>
          <div class="muted">${escapeHtml(fine.member?.batch || '-')}</div>
        </td>
        <td class="${bookClass}">${escapeHtml(bookTitle)}</td>
        <td class="amount">Rs. ${Number(fine.fine || 0).toLocaleString('en-IN')}</td>
        <td class="amount">Rs. ${Number(fine.paid_amount || 0).toLocaleString('en-IN')}</td>
        <td class="amount strong">Rs. ${Number(remaining).toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fine Report - ${escapeHtml(selectedBatch)} Batch</title>
        <style>
          @font-face {
            font-family: 'AnekMalayalamReport';
            src: url('/fonts/AnekMalayalam-Variable.ttf') format('truetype');
            font-weight: 100 800;
          }

          @font-face {
            font-family: 'NotoNaskhArabicReport';
            src: url('/fonts/NotoNaskhArabic-Regular.ttf') format('truetype');
            font-weight: 400;
          }

          @page {
            size: A4;
            margin: 14mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #111827;
            font-family: 'AnekMalayalamReport', Arial, sans-serif;
            background: #ffffff;
          }

          .report-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }

          h1 {
            margin: 0;
            font-size: 22px;
            letter-spacing: 0.02em;
          }

          .meta {
            margin-top: 4px;
            color: #4b5563;
            font-size: 12px;
          }

          .total-box {
            min-width: 180px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: right;
          }

          .total-box span {
            display: block;
            color: #6b7280;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .total-box strong {
            display: block;
            margin-top: 3px;
            font-size: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
          }

          th {
            background: #222222;
            color: #ffffff;
            text-align: left;
            padding: 8px;
            border: 1px solid #222222;
          }

          td {
            vertical-align: top;
            padding: 8px;
            border: 1px solid #d1d5db;
            line-height: 1.45;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          th:nth-child(1), td:nth-child(1) { width: 34px; text-align: center; }
          th:nth-child(2), td:nth-child(2) { width: 22%; }
          th:nth-child(3), td:nth-child(3) { width: 38%; }
          th:nth-child(4), td:nth-child(4),
          th:nth-child(5), td:nth-child(5),
          th:nth-child(6), td:nth-child(6) { width: 12%; }

          .muted {
            color: #6b7280;
            font-size: 10px;
            margin-top: 2px;
          }

          .amount {
            text-align: right;
            white-space: nowrap;
            font-family: Arial, sans-serif;
          }

          .strong {
            font-weight: 700;
          }

          .ml {
            font-family: 'AnekMalayalamReport', sans-serif;
            font-size: 12px;
            line-height: 1.6;
          }

          .arabic {
            direction: rtl;
            text-align: right;
            font-family: 'NotoNaskhArabicReport', 'Arial', sans-serif;
            font-size: 13px;
            line-height: 1.7;
          }

          .latin {
            font-family: 'AnekMalayalamReport', Arial, sans-serif;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <h1>Fine Report - ${escapeHtml(selectedBatch)} Batch</h1>
            <div class="meta">Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}</div>
            <div class="meta">Total records: ${fines.length}</div>
          </div>
          <div class="total-box">
            <span>Total Remaining Fine</span>
            <strong>Rs. ${Number(totalOwed).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Member</th>
              <th>Book</th>
              <th>Total Fine</th>
              <th>Paid</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `
}

function getScriptClass(value: string) {
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value)) return 'arabic'
  if (/[\u0D00-\u0D7F]/.test(value)) return 'ml'
  return 'latin'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// --- Helper Components ---
function StatCard({ label, value, icon, subtext, trend }: any) {
  const trendColor = trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-orange-100';
  return (
    <div className="bg-secondary-white rounded-xl p-6 shadow-md border border-primary-dark-grey flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-text-grey">{label}</p>
        <h3 className="text-3xl font-bold text-heading-text-black mt-1">{value}</h3>
        <p className="text-xs text-text-grey mt-2">{subtext}</p>
      </div>
      <div className={`p-3 rounded-full ${trendColor}`}>{icon}</div>
    </div>
  )
}

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-2xl w-full border border-primary-dark-grey" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// --- Component: Librarian Selector with Stats ---
function LibrarianSelector({ librarians, selected, onSelect, onAdd, allPayments }: any) {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        onAdd(newName);
        setIsAdding(false);
        setNewName('');
    }

    const amountOwned = useMemo(() => {
        if (!selected) return 0;
        // We only sum actual collections (amount_paid > 0), not write-offs
        return allPayments
            .filter((p: PaymentRecord) => p.librarian_name === selected && p.amount_paid > 0)
            .reduce((sum: number, p: PaymentRecord) => sum + (p.amount_paid || 0), 0);
    }, [selected, allPayments]);

    return (
        <div className="bg-primary-grey p-3 rounded-md border border-primary-dark-grey mb-4">
            <label className="block text-xs font-bold text-text-grey mb-1 uppercase">Librarian in Charge</label>
            <div className="flex gap-2">
                <select
                    value={selected}
                    onChange={(e) => onSelect(e.target.value)}
                    className="flex-1 p-2 text-sm border border-primary-dark-grey rounded-md bg-secondary-white focus:ring-2 focus:ring-dark-green outline-none"
                >
                    <option value="">-- Select Name --</option>
                    {librarians.map((l: any) => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
                <button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-secondary-white border border-primary-dark-grey rounded-md hover:bg-primary-dark-grey text-heading-text-black"><Plus size={18}/></button>
            </div>

            {isAdding && (
                <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                    <input
                        type="text"
                        placeholder="New Librarian Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 p-2 text-sm border border-primary-dark-grey rounded-md"
                    />
                    <button onClick={handleAdd} className="px-3 py-1 bg-dark-green text-white text-xs rounded-md">Add</button>
                </div>
            )}

            {selected && (
                <div className="mt-2 flex justify-between items-center text-sm bg-green-50 p-2 rounded border border-green-200">
                    <span className="text-green-800">Total Collected by {selected}:</span>
                    <span className="font-bold text-green-900 text-lg">₹{amountOwned}</span>
                </div>
            )}
        </div>
    )
}

function PaymentContent({ fine, amount, setAmount, onConfirm, onClose, librarians, selectedLibrarian, setSelectedLibrarian, onAddLibrarian, allPayments }: any) {
    const remaining = (fine.fine || 0) - (fine.paid_amount || 0);
    return <>
        <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center"><h2 className="text-lg font-bold font-heading">Record Payment</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-primary-dark-grey"><X size={20}/></button></div>
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-text-grey">Member</p>
                    <p className="font-bold text-heading-text-black text-lg">{fine.member.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-text-grey">Remaining Due</p>
                    <p className="font-bold text-red-600 text-xl">₹{remaining}</p>
                </div>
            </div>

            <LibrarianSelector
                librarians={librarians}
                selected={selectedLibrarian}
                onSelect={setSelectedLibrarian}
                onAdd={onAddLibrarian}
                allPayments={allPayments}
            />

            <div>
                <label className="text-sm font-semibold text-text-grey">Amount to Pay</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 p-3 border border-primary-dark-grey rounded-md bg-secondary-white focus:outline-none focus:ring-2 focus:ring-dark-green font-bold text-lg" placeholder="₹ Enter amount"/>
            </div>
        </div>
        <div className="flex justify-end gap-3 bg-primary-grey p-4 rounded-b-xl"><button onClick={onClose} className="px-5 py-2 text-sm font-semibold bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey">Cancel</button><button onClick={onConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-dark-green rounded-lg hover:bg-icon-green shadow-md">Confirm Payment</button></div>
    </>
}

function WriteOffContent({ fine, reason, setReason, onConfirm, onClose, librarians, selectedLibrarian, setSelectedLibrarian, onAddLibrarian, allPayments }: any) {
    return <>
        <div className="p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h3 className="mt-4 text-xl font-bold font-heading">Write Off Fine?</h3>
            <p className="mt-2 text-sm text-text-grey mb-4">
                This will forgive <strong className="text-red-600">₹{(fine.fine || 0) - (fine.paid_amount || 0)}</strong> for <strong className="text-heading-text-black">{fine.member.name}</strong>.
            </p>

            <div className="text-left">
                 <LibrarianSelector
                    librarians={librarians}
                    selected={selectedLibrarian}
                    onSelect={setSelectedLibrarian}
                    onAdd={onAddLibrarian}
                    allPayments={allPayments}
                />
            </div>

            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for mercy (e.g., Book damaged, medical reason...)"
                className="w-full mt-2 p-3 border border-primary-dark-grey rounded-md bg-secondary-white focus:outline-none focus:ring-2 focus:ring-dark-green text-sm"
                rows={3}
            />
        </div>
        <div className="flex justify-end gap-3 bg-primary-grey p-4 rounded-b-xl">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey">Cancel</button>
            <button onClick={onConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50" disabled={!reason.trim()}>
                Confirm Write-Off
            </button>
        </div>
    </>
}

function HistoryContent({ history, loading, onClose }: any) {
    return <>
        <div className="p-4 border-b border-primary-dark-grey flex justify-between items-center"><h2 className="text-lg font-bold font-heading">Fine Payment History</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-primary-dark-grey"><X size={20}/></button></div>
        <div className="p-0 max-h-[60vh] overflow-y-auto">
            {loading ? <Loading/> :
            <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-secondary-light-black text-white"><tr className="text-left"><th className="p-3">Date</th><th className="p-3">Details</th><th className="p-3">Librarian</th><th className="p-3 text-right">Amount</th></tr></thead>
                <tbody>{history.map((p:any) => (
                    <tr key={p.id} className="border-b border-primary-dark-grey hover:bg-primary-grey">
                        <td className="p-3 align-top text-xs text-text-grey">{dayjs(p.payment_date).format('DD MMM, h:mm A')}</td>
                        <td className="p-3 align-top">
                            <p className="font-bold text-heading-text-black">{p.borrow_records.member.name}</p>
                            <p className="text-xs text-text-grey truncate max-w-[150px]">{p.borrow_records.book.title}</p>
                            {p.notes && p.notes !== 'Standard Payment' && <p className="text-xs italic text-yellow-700 mt-1">"{p.notes}"</p>}
                        </td>
                        <td className="p-3 align-top text-xs font-medium text-blue-700">{p.librarian_name || '-'}</td>
                        <td className="p-3 align-top text-right">
                             {p.amount_paid > 0 ? <span className="font-bold text-green-700">₹{p.amount_paid}</span> : <span className="text-xs font-bold text-red-500">WAIVED</span>}
                        </td>
                    </tr>))}
                </tbody>
            </table>
            }
        </div>
    </>
}
