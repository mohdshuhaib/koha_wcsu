'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import * as XLSX from 'xlsx'

import ReferenceHeader from '@/components/catalog/reference/ReferenceHeader'
import CatalogFilters from '@/components/catalog/CatalogFilters'
import ReferenceCard from '@/components/catalog/reference/ReferenceCard'
import ReferenceDesktopRows from '@/components/catalog/reference/ReferenceDesktopRows'

import {
  PAGE_SIZE,
  LANGUAGE_OPTIONS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  getLanguageName,
} from '@/app/catalog/catalog-utils'
import type { Reference } from '@/types'

export default function ReferenceCatalogPage() {
  const [items, setItems] = useState<Reference[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  
  const [languageFilter, setLanguageFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('barcode')

  const fetchItems = async () => {
    setLoading(true)

    let query = supabase.from('reference').select('*')

    if (search.trim()) {
      const searchText = `%${search.trim()}%`
      query = query.or(
        `reference_name.ilike.${searchText},author.ilike.${searchText},publication.ilike.${searchText},barcode.ilike.${searchText}`
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
      console.error('Reference fetch error:', error)
      setItems([])
    } else {
      setItems((data as Reference[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [search, languageFilter, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [search, languageFilter, statusFilter, sortBy])

  const processedItems = useMemo(() => {
    const cloned = [...items]

    cloned.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':
          return (a.reference_name || '').localeCompare(b.reference_name || '')
        case 'barcode':
        default:
          return (a.barcode || '').localeCompare(b.barcode || '')
      }
    })

    return cloned
  }, [items, sortBy])

  const totalItems = processedItems.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1

  const paginatedItems = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE
    return processedItems.slice(from, to)
  }, [processedItems, page])

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const { data: allItems, error } = await supabase
        .from('reference')
        .select('*')
        .order('barcode')

      if (error || !allItems) {
        throw new Error('Failed to fetch reference for export.')
      }

      const worksheet = XLSX.utils.json_to_sheet(allItems)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reference')

      XLSX.writeFile(workbook, 'reference_catalog.xlsx')
    } catch (err) {
      console.error('Export failed:', err)
      alert('Could not export the catalog. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative z-30">
          <ReferenceHeader
            totalItems={totalItems}
            languageFilter={languageFilter}
            statusFilter={statusFilter}
            isExporting={isExporting}
            onExport={handleExport}
            languageOptions={LANGUAGE_OPTIONS}
            statusOptions={STATUS_OPTIONS}
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
            totalBooks={totalItems}
            languageOptions={LANGUAGE_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            sortOptions={SORT_OPTIONS}
          />
        </div>

        <section className="rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 p-4 shadow-xl sm:p-5 lg:p-6">
          {loading ? (
            <div className="py-12">
              <Loading />
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-primary-dark-grey bg-primary-grey/60 px-4 text-center">
              <div>
                <p className="text-lg font-semibold text-heading-text-black">
                  No references found
                </p>
                <p className="mt-2 text-sm text-text-grey">
                  Try changing the search, filters, or sort options.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:hidden">
                {paginatedItems.map((item) => (
                  <ReferenceCard
                    key={item.id}
                    item={item}
                    getLanguageName={getLanguageName}
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
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Name</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Author</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Language</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Publication</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Price</th>
                          <th className="px-4 py-4 font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedItems.map((item) => (
                          <ReferenceDesktopRows
                            key={item.id}
                            item={item}
                            getLanguageName={getLanguageName}
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
    </div>
  )
}
