'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import * as XLSX from 'xlsx'

import CatalogHeader from '@/components/catalog/CatalogHeader'
import CatalogFilters from '@/components/catalog/CatalogFilters'
import BookCard from '@/components/catalog/BookCard'
import DesktopBookRows from '@/components/catalog/DesktopBookRows'
import ReviewModal from '@/components/catalog/ReviewModal'

import {
  type Book,
  type ReviewFormState,
  PAGE_SIZE,
  LANGUAGE_OPTIONS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  CATALOG_LINKS,
  getLanguageName,
  getReviewStats,
} from './catalog-utils'

export default function CatalogPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [languageFilter, setLanguageFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('barcode')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isCatalogueDropdownOpen, setIsCatalogueDropdownOpen] = useState(false)
  const [reviewNotice, setReviewNotice] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [reviewForm, setReviewForm] = useState<ReviewFormState>({
    reviewer_name: '',
    reviewer_role: '',
    comment: '',
    rating: 0,
  })

  const fetchBooks = async () => {
    setLoading(true)

    let query = supabase.from('books').select(`
      *,
      borrow_records(return_date, members(name)),
      hold_records(released, hold_date, member:members(name)),
      book_reviews(id, reviewer_name, reviewer_role, comment, rating, created_at, approved)
    `)

    if (search.trim()) {
      const searchText = `%${search.trim()}%`
      query = query.or(
        `title.ilike.${searchText},author.ilike.${searchText},language.ilike.${searchText},call_number.ilike.${searchText},barcode.ilike.${searchText},edition.ilike.${searchText},publication.ilike.${searchText}`
      )
    }

    if (languageFilter !== 'ALL') {
      query = query.eq('language', languageFilter)
    }

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Catalog fetch error:', error)
      setBooks([])
    } else {
      setBooks((data as Book[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchBooks()
  }, [search, languageFilter, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [search, languageFilter, statusFilter, sortBy])

  const processedBooks = useMemo(() => {
    const cloned = [...books]

    cloned.sort((a, b) => {
      const aStats = getReviewStats(a.book_reviews)
      const bStats = getReviewStats(b.book_reviews)

      switch (sortBy) {
        case 'top_rated':
          if (bStats.average !== aStats.average) return bStats.average - aStats.average
          if (bStats.count !== aStats.count) return bStats.count - aStats.count
          return (a.title || '').localeCompare(b.title || '')

        case 'most_reviewed':
          if (bStats.count !== aStats.count) return bStats.count - aStats.count
          if (bStats.average !== aStats.average) return bStats.average - aStats.average
          return (a.title || '').localeCompare(b.title || '')

        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '')

        case 'barcode':
        default:
          return (a.barcode || '').localeCompare(b.barcode || '')
      }
    })

    return cloned
  }, [books, sortBy])

  const totalBooks = processedBooks.length
  const totalPages = Math.ceil(totalBooks / PAGE_SIZE) || 1

  const paginatedBooks = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE
    return processedBooks.slice(from, to)
  }, [processedBooks, page])

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const { data: allBooks, error } = await supabase
        .from('books')
        .select('title, author, barcode, language, call_number, pages, price, edition, publication, status')
        .order('language')
        .order('title')

      if (error || !allBooks) {
        throw new Error('Failed to fetch books for export.')
      }

      const booksByLanguage = allBooks.reduce((acc, book) => {
        const lang = getLanguageName(book.language) || 'Unknown'
        if (!acc[lang]) acc[lang] = []

        const { language, ...bookData } = book
        acc[lang].push(bookData)
        return acc
      }, {} as Record<string, any[]>)

      const workbook = XLSX.utils.book_new()

      for (const language in booksByLanguage) {
        const worksheet = XLSX.utils.json_to_sheet(booksByLanguage[language])
        XLSX.utils.book_append_sheet(workbook, worksheet, language.slice(0, 31))
      }

      XLSX.writeFile(workbook, 'library_catalog_by_language.xlsx')
    } catch (err) {
      console.error('Export failed:', err)
      alert('Could not export the catalog. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const resetReviewForm = () => {
    setReviewForm({
      reviewer_name: '',
      reviewer_role: '',
      comment: '',
      rating: 0,
    })
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBook) return

    if (!reviewForm.reviewer_name.trim()) {
      setReviewNotice({ type: 'error', text: 'Please enter your name before submitting the review.' })
      return
    }

    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setReviewNotice({ type: 'error', text: 'Please select a star rating before submitting the review.' })
      return
    }

    setIsSubmittingReview(true)
    setReviewNotice(null)

    const { error } = await supabase.from('book_reviews').insert({
      book_id: selectedBook.id,
      reviewer_name: reviewForm.reviewer_name.trim(),
      reviewer_role: reviewForm.reviewer_role.trim() || null,
      comment: reviewForm.comment.trim() || null,
      rating: reviewForm.rating,
    })

    setIsSubmittingReview(false)

    if (error) {
      console.error('Review insert error:', error)
      setReviewNotice({
        type: 'error',
        text: 'We could not save your review right now. Please try again.',
      })
      return
    }

    setReviewNotice({
      type: 'success',
      text: `Thank you for sharing your review of "${selectedBook.title}". It has been saved successfully.`,
    })
    setSelectedBook(null)
    resetReviewForm()
    fetchBooks()
  }

  return (
    <div className="min-h-screen bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative z-30">
          <CatalogHeader
            totalBooks={totalBooks}
            languageFilter={languageFilter}
            statusFilter={statusFilter}
            isExporting={isExporting}
            onExport={handleExport}
            isCatalogueDropdownOpen={isCatalogueDropdownOpen}
            setIsCatalogueDropdownOpen={setIsCatalogueDropdownOpen}
            languageOptions={LANGUAGE_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            catalogLinks={CATALOG_LINKS}
          />
        </div>

        <div className="relative z-10">
          <CatalogFilters
            search={search}
            setSearch={setSearch}
            languageFilter={languageFilter}
            setLanguageFilter={setLanguageFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            totalBooks={totalBooks}
            languageOptions={LANGUAGE_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            sortOptions={SORT_OPTIONS}
          />
        </div>

        {reviewNotice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              reviewNotice.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {reviewNotice.text}
          </div>
        )}

        <section className="rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 p-4 shadow-xl sm:p-5 lg:p-6">
          {loading ? (
            <div className="py-12">
              <Loading />
            </div>
          ) : paginatedBooks.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-primary-dark-grey bg-primary-grey/60 px-4 text-center">
              <div>
                <p className="text-lg font-semibold text-heading-text-black">
                  No books found
                </p>
                <p className="mt-2 text-sm text-text-grey">
                  Try changing the search, filters, or sort options.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:hidden">
                {paginatedBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpenReview={() => setSelectedBook(book)}
                    getLanguageName={getLanguageName}
                    getReviewStats={getReviewStats}
                  />
                ))}
              </div>

              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-[1.5rem] border border-primary-dark-grey">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-secondary-light-black text-white">
                        <tr>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Barcode</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Title</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Author</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Language</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Pages</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Call Number</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Edition</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Publication</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Price</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedBooks.map((book) => (
                          <DesktopBookRows
                            key={book.id}
                            book={book}
                            onOpenReview={() => setSelectedBook(book)}
                            getLanguageName={getLanguageName}
                            getReviewStats={getReviewStats}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-grey">
                  Page <span className="font-semibold">{page}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-primary-dark-grey bg-white text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ‹
                  </button>

                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-primary-dark-grey bg-white text-heading-text-black transition hover:bg-primary-grey disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedBook && (
        <ReviewModal
          book={selectedBook}
          form={reviewForm}
          setForm={setReviewForm}
          onClose={() => {
            setSelectedBook(null)
            resetReviewForm()
          }}
          onSubmit={handleReviewSubmit}
          submitting={isSubmittingReview}
        />
      )}
    </div>
  )
}
