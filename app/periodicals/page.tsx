'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '../loading'
import { Plus, BookOpen, Download, AlertTriangle } from 'lucide-react'
import AddPeriodicalModal from '@/components/AddPeriodicalModal'
import PeriodicalCard from '@/components/PeriodicalCard'
import * as XLSX from 'xlsx' // Import the Excel library

// Type definitions remain the same
export type Periodical = {
  id: string;
  name: string;
  language: string;
  image_url: string;
  type: 'weekly' | 'monthly' | 'yearly' | string;
}

export type PeriodicalRecord = {
  id: string;
  periodical_id: string;
  borrow_date: string;
  issue_identifier: string;
  borrower_name: string;
  return_date: string | null;
  created_by_name?: string | null;
  returned_by_name?: string | null;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, loading, periodical }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  periodical: Periodical | null;
}) {
  if (!isOpen || !periodical) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-secondary-white rounded-xl shadow-2xl max-w-sm w-full border border-primary-dark-grey">
        <div className="p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-xl font-bold font-heading text-heading-text-black">Delete Periodical?</h3>
          <p className="mt-2 text-sm text-text-grey">
            Are you sure you want to permanently delete "{periodical.name}" and all of its borrowing records? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 bg-primary-grey p-4 rounded-b-xl">
          <button onClick={onClose} disabled={loading} className="px-5 py-2 text-sm font-semibold text-text-grey bg-secondary-white border border-primary-dark-grey rounded-lg hover:bg-primary-dark-grey disabled:opacity-70">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-70">
            {loading ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PeriodicalsPage() {
  const [loading, setLoading] = useState(true)
  const [periodicals, setPeriodicals] = useState<Periodical[]>([])
  const [records, setRecords] = useState<PeriodicalRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPeriodical, setEditingPeriodical] = useState<Periodical | null>(null)
  const [isExporting, setIsExporting] = useState(false) // State for export button
  const [periodicalToDelete, setPeriodicalToDelete] = useState<Periodical | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: pData } = await supabase.from('periodicals').select('*').order('name');
    const { data: rData } = await supabase.from('periodical_records').select('*').order('borrow_date', { ascending: false });
    if (pData) setPeriodicals(pData)
    if (rData) setRecords(rData)
    setLoading(false)
  }

  const handleEdit = (periodical: Periodical) => {
    setEditingPeriodical(periodical);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPeriodical(null);
  };

  const handleDeletePeriodical = async () => {
    if (!periodicalToDelete) return;

    setIsDeleting(true);
    try {
      const { error: recordsError } = await supabase
        .from('periodical_records')
        .delete()
        .eq('periodical_id', periodicalToDelete.id);

      if (recordsError) throw recordsError;

      const { error: periodicalError } = await supabase
        .from('periodicals')
        .delete()
        .eq('id', periodicalToDelete.id);

      if (periodicalError) throw periodicalError;

      setPeriodicalToDelete(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete periodical:', error);
      alert('Failed to delete the periodical. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- NEW: Function to handle multi-sheet Excel Export ---
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
        if (periodicals.length === 0 || records.length === 0) {
            alert("No data available to export.");
            return;
        }

        const workbook = XLSX.utils.book_new();

        // Create a sheet for each periodical
        periodicals.forEach(periodical => {
            const periodicalRecords = records
                .filter(r => r.periodical_id === periodical.id)
                .map(r => ({ // Format data for Excel
                    'Borrower Name': r.borrower_name,
                    'Issue/Identifier': r.issue_identifier,
                    'Borrowed Date': r.borrow_date,
                    'Return Date': r.return_date ? new Date(r.return_date).toLocaleDateString() : 'Not Returned',
                }));

            if (periodicalRecords.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(periodicalRecords);
                // Sanitize sheet name (remove invalid characters)
                const sheetName = periodical.name.replace(/[*?:/\\\[\]]/g, "").substring(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            }
        });

        if (workbook.SheetNames.length === 0) {
            alert("No records found to export.");
            return;
        }

        XLSX.writeFile(workbook, 'periodicals_borrowing_history.xlsx');

    } catch (err) {
        console.error("Export failed:", err);
        alert("Could not export the data. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  const recordsByPeriodicalId = records.reduce((acc, record) => {
    const key = record.periodical_id;
    if (!acc[key]) { acc[key] = []; }
    acc[key].push(record);
    return acc;
  }, {} as Record<string, PeriodicalRecord[]>);

  if (loading) return <Loading />

  return (
    <>
      <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
                Periodicals
              </h1>
              <p className="text-text-grey mt-1">Manage magazine and journal subscriptions and their borrowing history.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                 <button
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 w-full md:w-auto bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-70"
                >
                    <Download size={20} />
                    {isExporting ? 'Exporting...' : 'Export All'}
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 w-full md:w-auto bg-button-yellow text-button-text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition shadow-md"
                >
                    <Plus size={20} /> Add New Periodical
                </button>
            </div>
          </div>

          <div className="space-y-4">
            {periodicals.length > 0 ? (
              periodicals.map((periodical) => (
                <PeriodicalCard
                  key={periodical.id}
                  periodical={periodical}
                  records={recordsByPeriodicalId[periodical.id] || []}
                  onUpdate={fetchData}
                  onEdit={() => handleEdit(periodical)}
                  onDelete={setPeriodicalToDelete}
                />
              ))
            ) : (
              <div className="text-center bg-secondary-white p-12 rounded-xl border border-primary-dark-grey">
                   <BookOpen className="mx-auto h-12 w-12 text-text-grey" />
                   <h3 className="mt-2 text-lg font-medium text-heading-text-black">No Periodicals Found</h3>
                   <p className="mt-1 text-sm text-text-grey">Click 'Add New Periodical' to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AddPeriodicalModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={fetchData}
        periodicalToEdit={editingPeriodical}
      />
      <ConfirmationModal
        isOpen={!!periodicalToDelete}
        onClose={() => setPeriodicalToDelete(null)}
        onConfirm={handleDeletePeriodical}
        loading={isDeleting}
        periodical={periodicalToDelete}
      />
    </>
  )
}
