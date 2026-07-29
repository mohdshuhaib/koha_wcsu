'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import Loading from '@/app/loading'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, FileText, Download, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import clsx from 'classnames'

export default function BulkUploadRisalaPage() {
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setIsLoggedIn(true)
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const processFile = async (file: File) => {
    setLoading(true)
    setUploadResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error("The selected file is empty or in the wrong format.")
      }

      const risalas = jsonData.map((row: any) => ({
        risala_name: row.risala_name || '',
        author: row.author || null,
        language: row.language || '',
        mushrif: row.mushrif || null,
        department: row.department || null,
        year: row.year?.toString() || null,
        section_no: row.section_no?.toString() || null,
        barcode: row.barcode?.toString() || '',
        status: row.status || 'available',
      }))

      const { error } = await supabase.from('risala').insert(risalas)

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      } else {
        setUploadResult({ type: 'success', message: `${risalas.length} risalas were uploaded successfully!` })
        setSelectedFile(null)
      }
    } catch (err: any) {
      setUploadResult({ type: 'error', message: `Error processing file: ${err.message}` })
    }

    setLoading(false)
  }

  const handleFileSelect = (file: File | null) => {
    if (file) {
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setUploadResult({ type: 'error', message: 'Invalid file type. Please upload a .xlsx file.' })
        return;
      }
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleDownloadTemplate = () => {
    const headers = [['risala_name', 'author', 'language', 'mushrif', 'department', 'year', 'section_no', 'barcode']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risalas');
    XLSX.writeFile(wb, 'risala_template.xlsx');
  }

  if (loading && !isLoggedIn) return <Loading />
  if (!isLoggedIn) return null

  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-5xl mx-auto">
        <Link href="/books" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Book Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <div className="text-center border-b border-primary-dark-grey pb-6 mb-6">
            <h1 className="text-2xl font-bold text-heading-text-black uppercase font-heading tracking-wider">
              Bulk Upload Risala
            </h1>
            <p className="text-text-grey mt-1">Upload an Excel (.xlsx) file to add multiple risalas to the catalog at once.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                className={clsx(
                  "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isDragging ? 'border-dark-green bg-green-50' : 'border-primary-dark-grey bg-primary-grey hover:bg-gray-200'
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-text-grey">
                  <UploadCloud size={40} className="mb-3" />
                  <p className="mb-2 text-sm font-semibold">Drag & drop file here</p>
                  <p className="text-xs">or <span className="font-bold text-dark-green">click to browse</span></p>
                </div>
                <input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} />
              </label>

              {selectedFile && !loading && (
                <div className="p-3 bg-primary-grey border border-primary-dark-grey rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-dark-green" />
                    <span className="text-sm font-medium text-heading-text-black">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XCircle size={18} /></button>
                </div>
              )}

              {loading && <p className="mt-4 text-dark-green font-semibold text-center">Processing file, please wait...</p>}

              {uploadResult && (
                <div className={clsx("flex items-center gap-3 p-3 rounded-lg text-sm", uploadResult.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>
                  {uploadResult.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  <span className="font-medium">{uploadResult.message}</span>
                </div>
              )}

              <button onClick={() => processFile(selectedFile!)} disabled={!selectedFile || loading} className="w-full bg-button-yellow text-button-text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition disabled:opacity-60">
                {loading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>

            <div className="bg-primary-grey p-6 rounded-lg border border-primary-dark-grey">
              <h3 className="font-bold text-lg text-heading-text-black mb-3">Instructions</h3>
              <div className="space-y-3 text-sm text-text-grey">
                <p>1. Download the template file to ensure your data is in the correct format.</p>
                <p>2. Fill in the details. The required columns are:</p>
                <div className="flex flex-wrap gap-2">
                  {['risala_name', 'language', 'barcode'].map(col => (
                    <code key={col} className="px-2 py-1 bg-gray-300 text-heading-text-black rounded text-xs font-semibold">{col}</code>
                  ))}
                </div>
                <p>3. The optional columns are:</p>
                <div className="flex flex-wrap gap-2">
                  {['author', 'mushrif', 'department', 'year', 'section_no'].map(col => (
                    <code key={col} className="px-2 py-1 bg-gray-300 text-heading-text-black rounded text-xs font-semibold">{col}</code>
                  ))}
                </div>
                <p>Leave optional columns empty if the details are not known.</p>
                <p>4. Save the file and upload it using the panel on the left.</p>
              </div>
              <button onClick={handleDownloadTemplate} className="w-full mt-6 flex items-center justify-center gap-2 bg-dark-green text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-icon-green transition">
                <Download size={16} /> Download Template.xlsx
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
