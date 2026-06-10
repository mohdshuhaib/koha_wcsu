'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import clsx from 'classnames'
import {
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import { jsPDF } from 'jspdf'

type SourceTab = 'manual' | 'members' | 'books'
type PageSize = 'a4' | 'a3'
type SortDirection = 'asc' | 'desc'

type MemberRow = {
  id: string
  name: string
  barcode: string
  batch: string | null
}

type BookRow = {
  id: string
  title: string
  author: string | null
  barcode: string
  language: string | null
}

const BARCODE_WIDTH_MM = 24
const BARCODE_HEIGHT_MM = 15
const DEFAULT_MARGIN_MM = 10
const MAX_BOOK_PAGE_SIZE = 20

const PAGE_SIZES: Record<PageSize, { label: string; jsPdfFormat: 'a4' | 'a3' }> = {
  a4: { label: 'A4', jsPdfFormat: 'a4' },
  a3: { label: 'A3', jsPdfFormat: 'a3' },
}

export default function BarcodeGeneratorPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<SourceTab>('manual')
  const [manualBarcodes, setManualBarcodes] = useState('')
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM)
  const [generating, setGenerating] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  const [members, setMembers] = useState<MemberRow[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('ALL')

  const [books, setBooks] = useState<BookRow[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [bookLanguage, setBookLanguage] = useState('ALL')
  const [bookSort, setBookSort] = useState<SortDirection>('asc')
  const [bookPageSize, setBookPageSize] = useState(20)
  const [bookPage, setBookPage] = useState(1)
  const [bookCount, setBookCount] = useState(0)
  const [languages, setLanguages] = useState<string[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!authChecked) return

    const fetchMembers = async () => {
      setMembersLoading(true)
      const { data } = await supabase
        .from('members')
        .select('id, name, barcode, batch')
        .order('name', { ascending: true })

      setMembers((data as MemberRow[]) || [])
      setMembersLoading(false)
    }

    const fetchLanguages = async () => {
      const { data } = await supabase
        .from('books')
        .select('language')
        .not('language', 'is', null)
        .order('language', { ascending: true })

      const uniqueLanguages = Array.from(
        new Set(((data || []) as { language: string | null }[]).map((book) => book.language).filter(Boolean) as string[])
      )

      setLanguages(uniqueLanguages)
    }

    fetchMembers()
    fetchLanguages()
  }, [authChecked])

  const batches = useMemo(() => {
    return Array.from(new Set(members.map((member) => member.batch).filter(Boolean) as string[])).sort()
  }, [members])

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()

    return members.filter((member) => {
      const matchesBatch = selectedBatch === 'ALL' || member.batch === selectedBatch
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.barcode.toLowerCase().includes(query) ||
        (member.batch || '').toLowerCase().includes(query)

      return matchesBatch && matchesSearch
    })
  }, [memberSearch, members, selectedBatch])

  const manualBarcodeList = useMemo(() => parseBarcodeLines(manualBarcodes), [manualBarcodes])
  const visibleMemberBarcodes = useMemo(() => filteredMembers.map((member) => member.barcode).filter(Boolean), [filteredMembers])
  const visibleBookBarcodes = useMemo(() => books.map((book) => book.barcode).filter(Boolean), [books])

  const bookTotalPages = Math.max(1, Math.ceil(bookCount / bookPageSize))

  const fetchBooks = async (nextPage = bookPage) => {
    setBooksLoading(true)
    const safePageSize = Math.min(Math.max(bookPageSize, 1), MAX_BOOK_PAGE_SIZE)
    const from = (nextPage - 1) * safePageSize
    const to = from + safePageSize - 1

    let query = supabase
      .from('books')
      .select('id, title, author, barcode, language', { count: 'exact' })
      .not('barcode', 'is', null)

    const trimmedSearch = bookSearch.trim()
    if (trimmedSearch) {
      const text = `%${trimmedSearch}%`
      query = query.or(`title.ilike.${text},author.ilike.${text},barcode.ilike.${text}`)
    }

    if (bookLanguage !== 'ALL') {
      query = query.eq('language', bookLanguage)
    }

    const { data, count } = await query
      .order('barcode', { ascending: bookSort === 'asc' })
      .range(from, to)

    setBooks((data as BookRow[]) || [])
    setBookCount(count || 0)
    setBookPage(nextPage)
    setBooksLoading(false)
  }

  const copyText = async (value: string, key: string) => {
    if (!value.trim()) return
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1500)
  }

  const appendToManual = (barcodes: string[]) => {
    if (barcodes.length === 0) return
    setManualBarcodes((current) => {
      const separator = current.trim() ? '\n' : ''
      return `${current.trimEnd()}${separator}${barcodes.join('\n')}`
    })
    setActiveTab('manual')
  }

  const generatePdf = async () => {
    const barcodes = manualBarcodeList
    if (barcodes.length === 0) {
      alert('Add at least one barcode in the manual barcode box.')
      return
    }

    setGenerating(true)

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: PAGE_SIZES[pageSize].jsPdfFormat,
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const gapX = 4
      const gapY = 5
      const usableWidth = pageWidth - marginMm * 2
      const usableHeight = pageHeight - marginMm * 2
      const columns = Math.max(1, Math.floor((usableWidth + gapX) / (BARCODE_WIDTH_MM + gapX)))
      const rows = Math.max(1, Math.floor((usableHeight + gapY) / (BARCODE_HEIGHT_MM + gapY)))
      const perPage = columns * rows

      for (let index = 0; index < barcodes.length; index += 1) {
        if (index > 0 && index % perPage === 0) doc.addPage()

        const pageIndex = index % perPage
        const column = pageIndex % columns
        const row = Math.floor(pageIndex / columns)
        const x = marginMm + column * (BARCODE_WIDTH_MM + gapX)
        const y = marginMm + row * (BARCODE_HEIGHT_MM + gapY)
        const image = await createBarcodeDataUrl(barcodes[index])

        doc.addImage(image, 'PNG', x, y, BARCODE_WIDTH_MM, 10.5)
        doc.setFont('courier', 'normal')
        doc.setFontSize(6)
        doc.text(barcodes[index], x + BARCODE_WIDTH_MM / 2, y + 13.6, {
          align: 'center',
          maxWidth: BARCODE_WIDTH_MM,
        })
      }

      doc.save(`library-barcodes-${PAGE_SIZES[pageSize].label.toLowerCase()}.pdf`)
    } catch (error) {
      console.error(error)
      alert('Could not generate the barcode PDF. Please check the barcode values and try again.')
    } finally {
      setGenerating(false)
    }
  }

  const printPreview = async () => {
    const barcodes = manualBarcodeList
    if (barcodes.length === 0) {
      alert('Add at least one barcode in the manual barcode box.')
      return
    }

    setGenerating(true)

    try {
      const items = await Promise.all(
        barcodes.map(async (barcode) => ({
          barcode,
          image: await createBarcodeDataUrl(barcode),
        }))
      )

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return

      printWindow.document.write(createPrintHtml(items, pageSize, marginMm))
      printWindow.document.close()
      printWindow.focus()
      printWindow.setTimeout(() => printWindow.print(), 400)
    } catch (error) {
      console.error(error)
      alert('Could not open print preview.')
    } finally {
      setGenerating(false)
    }
  }

  if (!authChecked) return <Loading />

  return (
    <main className="min-h-screen bg-primary-grey px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wider text-heading-text-black md:text-4xl">
              Barcode Generator
            </h1>
            <p className="mt-1 max-w-3xl text-text-grey">
              Create Code 128B barcode sheets for book and member labels with exact 2.4cm x 1.5cm label sizing.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-primary-dark-grey bg-secondary-white p-3 shadow-sm sm:grid-cols-3">
            <SelectField label="Page" value={pageSize} onChange={(value) => setPageSize(value as PageSize)}>
              <option value="a4">A4</option>
              <option value="a3">A3</option>
            </SelectField>
            <NumberField label="Margin mm" value={marginMm} min={5} max={25} onChange={setMarginMm} />
            <div className="flex items-end gap-2">
              <button
                onClick={printPreview}
                disabled={generating || manualBarcodeList.length === 0}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary-dark-grey bg-white px-3 text-sm font-bold text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={generatePdf}
                disabled={generating || manualBarcodeList.length === 0}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-button-yellow px-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                PDF
              </button>
            </div>
          </div>
        </div>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
          <div className="min-w-0 rounded-2xl border border-primary-dark-grey bg-secondary-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-heading-text-black">Manual Barcodes</h2>
                <p className="text-sm text-text-grey">One barcode per line. Paste copied member or book barcodes here.</p>
              </div>
              <span className="rounded-full bg-primary-grey px-3 py-1 text-xs font-bold text-text-grey">
                {manualBarcodeList.length} total
              </span>
            </div>

            <textarea
              value={manualBarcodes}
              onChange={(event) => setManualBarcodes(event.target.value)}
              placeholder={'BK0001\nBK0002\nMEM001'}
              className="h-80 w-full resize-none rounded-xl border border-primary-dark-grey bg-primary-grey p-4 font-mono text-sm leading-6 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => copyText(manualBarcodeList.join('\n'), 'manual-all')}
                disabled={manualBarcodeList.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary-dark-grey bg-white px-4 text-sm font-bold text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copiedKey === 'manual-all' ? <Check size={16} /> : <Copy size={16} />}
                Copy Manual List
              </button>
              <button
                onClick={() => setManualBarcodes('')}
                disabled={!manualBarcodes.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear List
              </button>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-primary-dark-grey bg-secondary-white p-4 shadow-lg sm:p-5">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-primary-grey p-1">
              <SourceButton active={activeTab === 'manual'} icon={<FileText size={16} />} label="Manual" onClick={() => setActiveTab('manual')} />
              <SourceButton active={activeTab === 'members'} icon={<Users size={16} />} label="Members" onClick={() => setActiveTab('members')} />
              <SourceButton active={activeTab === 'books'} icon={<BookOpen size={16} />} label="Books" onClick={() => setActiveTab('books')} />
            </div>

            {activeTab === 'manual' && (
              <div className="rounded-xl border border-primary-dark-grey bg-primary-grey p-5">
                <h2 className="text-lg font-bold text-heading-text-black">Barcode Sheet Settings</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <InfoBox label="Barcode type" value="Code 128B" />
                  <InfoBox label="Label size" value="2.4cm x 1.5cm" />
                  <InfoBox label="Text font" value="OCR-style" />
                </div>
                <p className="mt-4 text-sm leading-6 text-text-grey">
                  Use the Members and Books tabs to copy barcodes into the manual box, then print or export the PDF.
                </p>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <SearchInput value={memberSearch} onChange={setMemberSearch} placeholder="Search name, barcode, batch" />
                  <SelectField label="Batch" value={selectedBatch} onChange={setSelectedBatch}>
                    <option value="ALL">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </SelectField>
                  <CopyGroup
                    disabled={visibleMemberBarcodes.length === 0}
                    copied={copiedKey === 'members-page'}
                    onCopy={() => copyText(visibleMemberBarcodes.join('\n'), 'members-page')}
                    onAppend={() => appendToManual(visibleMemberBarcodes)}
                  />
                </div>

                {membersLoading ? <Loading /> : (
                  <DataTable
                    headers={['Name', 'Barcode', 'Batch']}
                    emptyText="No members found."
                    rows={filteredMembers.map((member) => [
                      member.name,
                      <CopyableBarcode key={member.id} barcode={member.barcode} copied={copiedKey === member.barcode} onCopy={copyText} />,
                      member.batch || '-',
                    ])}
                  />
                )}
              </div>
            )}

            {activeTab === 'books' && (
              <div className="space-y-4">
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_150px_auto]">
                  <SearchInput value={bookSearch} onChange={setBookSearch} placeholder="Search title, author, barcode" />
                  <SelectField label="Language" value={bookLanguage} onChange={setBookLanguage}>
                    <option value="ALL">All Languages</option>
                    {languages.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </SelectField>
                  <SelectField label="Barcode order" value={bookSort} onChange={(value) => setBookSort(value as SortDirection)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </SelectField>
                  <SelectField label="Per page" value={String(bookPageSize)} onChange={(value) => setBookPageSize(Math.min(Number(value), MAX_BOOK_PAGE_SIZE))}>
                    {Array.from({ length: MAX_BOOK_PAGE_SIZE }, (_, index) => index + 1).map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </SelectField>
                  <button
                    onClick={() => fetchBooks(1)}
                    className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-dark-green px-5 text-sm font-bold text-white transition hover:bg-icon-green"
                  >
                    <Search size={16} />
                    Search
                  </button>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-primary-dark-grey bg-primary-grey p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-text-grey">
                    Showing {books.length} of {bookCount} books. Page {bookPage} of {bookTotalPages}.
                  </p>
                  <CopyGroup
                    disabled={visibleBookBarcodes.length === 0}
                    copied={copiedKey === 'books-page'}
                    onCopy={() => copyText(visibleBookBarcodes.join('\n'), 'books-page')}
                    onAppend={() => appendToManual(visibleBookBarcodes)}
                  />
                </div>

                {booksLoading ? <Loading /> : (
                  <DataTable
                    headers={['Title', 'Author', 'Barcode', 'Language']}
                    emptyText="Search to show books."
                    rows={books.map((book) => [
                      book.title,
                      book.author || '-',
                      <CopyableBarcode key={book.id} barcode={book.barcode} copied={copiedKey === book.barcode} onCopy={copyText} />,
                      book.language || '-',
                    ])}
                  />
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => fetchBooks(Math.max(1, bookPage - 1))}
                    disabled={booksLoading || bookPage <= 1}
                    className="rounded-lg border border-primary-dark-grey bg-white px-4 py-2 text-sm font-bold text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchBooks(Math.min(bookTotalPages, bookPage + 1))}
                    disabled={booksLoading || bookPage >= bookTotalPages || bookCount === 0}
                    className="rounded-lg border border-primary-dark-grey bg-white px-4 py-2 text-sm font-bold text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function parseBarcodeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

async function createBarcodeDataUrl(value: string) {
  const bwipjs = await import('bwip-js')
  const canvas = document.createElement('canvas')
  const toCanvas = (bwipjs as any).toCanvas || (bwipjs as any).default?.toCanvas

  toCanvas(canvas, {
    bcid: 'code128',
    text: value,
    parsefnc: false,
    includetext: false,
    scale: 4,
    height: 8,
    paddingwidth: 0,
    paddingheight: 0,
    backgroundcolor: 'FFFFFF',
  })

  return canvas.toDataURL('image/png')
}

function createPrintHtml(items: { barcode: string; image: string }[], pageSize: PageSize, marginMm: number) {
  const pageLabel = PAGE_SIZES[pageSize].label
  const itemHtml = items
    .map(
      (item) => `
        <div class="barcode-item">
          <img src="${item.image}" alt="${escapeHtml(item.barcode)}" />
          <div class="barcode-text">${escapeHtml(item.barcode)}</div>
        </div>
      `
    )
    .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <title>Library Barcodes</title>
        <style>
          @page { size: ${pageLabel}; margin: ${marginMm}mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .sheet {
            display: flex;
            flex-wrap: wrap;
            gap: 5mm 4mm;
            align-content: flex-start;
          }
          .barcode-item {
            width: ${BARCODE_WIDTH_MM}mm;
            height: ${BARCODE_HEIGHT_MM}mm;
            overflow: hidden;
            break-inside: avoid;
            text-align: center;
          }
          .barcode-item img {
            display: block;
            width: ${BARCODE_WIDTH_MM}mm;
            height: 10.5mm;
            object-fit: fill;
          }
          .barcode-text {
            margin-top: 0.8mm;
            font-family: "OCR B", "OCR A", "Courier New", monospace;
            font-size: 6pt;
            line-height: 1;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="sheet">${itemHtml}</div>
      </body>
    </html>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function SourceButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition',
        active ? 'bg-dark-green text-white shadow-sm' : 'text-text-grey hover:bg-white hover:text-heading-text-black'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-grey">Search</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-grey" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-3 text-sm font-medium text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
        />
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-grey">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-primary-dark-grey bg-primary-grey px-3 text-sm font-bold text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
      >
        {children}
      </select>
    </label>
  )
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-grey">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))}
        className="h-11 w-full rounded-xl border border-primary-dark-grey bg-primary-grey px-3 text-sm font-bold text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
      />
    </label>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary-dark-grey bg-secondary-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-text-grey">{label}</p>
      <p className="mt-1 text-sm font-bold text-heading-text-black">{value}</p>
    </div>
  )
}

function CopyGroup({ disabled, copied, onCopy, onAppend }: { disabled: boolean; copied: boolean; onCopy: () => void; onAppend: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 self-end sm:flex">
      <button
        onClick={onCopy}
        disabled={disabled}
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-primary-dark-grey bg-white px-3 text-sm font-bold text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-60"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        Copy
      </button>
      <button
        onClick={onAppend}
        disabled={disabled}
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-button-yellow px-3 text-sm font-bold text-button-text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={16} />
        Add
      </button>
    </div>
  )
}

function CopyableBarcode({ barcode, copied, onCopy }: { barcode: string; copied: boolean; onCopy: (value: string, key: string) => void }) {
  return (
    <button
      onClick={() => onCopy(barcode, barcode)}
      className="inline-flex max-w-full items-center gap-2 rounded-lg bg-primary-grey px-3 py-1.5 font-mono text-sm font-bold text-heading-text-black transition hover:bg-primary-dark-grey"
      title="Copy barcode"
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{barcode}</span>
      {copied ? <Check size={14} className="text-dark-green" /> : <Copy size={14} className="text-text-grey" />}
    </button>
  )
}

function DataTable({ headers, rows, emptyText }: { headers: string[]; rows: React.ReactNode[][]; emptyText: string }) {
  return (
    <div className="min-w-0">
      <div className="grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-primary-dark-grey bg-primary-grey px-4 py-10 text-center text-sm font-medium text-text-grey">
            {emptyText}
          </div>
        ) : (
          rows.map((row, rowIndex) => (
            <div key={rowIndex} className="min-w-0 rounded-xl border border-primary-dark-grey bg-secondary-white p-4 shadow-sm">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="min-w-0 border-b border-primary-dark-grey py-2 last:border-b-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sub-heading-text-grey">
                    {headers[cellIndex]}
                  </p>
                  <div className="mt-1 min-w-0 break-words text-sm font-medium text-heading-text-black">
                    {cell}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-primary-dark-grey md:block">
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-secondary-light-black text-white">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-secondary-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center font-medium text-text-grey">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-primary-dark-grey last:border-b-0 hover:bg-primary-grey/70">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-[18rem] px-4 py-3 align-middle text-text-grey">
                      <div className="min-w-0 break-words">
                        {cell}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
