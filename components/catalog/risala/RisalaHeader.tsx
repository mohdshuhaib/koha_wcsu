'use client'

import { Dispatch, SetStateAction } from 'react'
import { Download, BookOpen, Languages, Library, Filter, Loader2 } from 'lucide-react'
import SummaryCard from '@/components/catalog/SummaryCard'

type Option = {
  label: string
  value: string
}

export default function RisalaHeader({
  totalItems,
  languageFilter,
  statusFilter,
  isExporting,
  onExport,
  languageOptions,
  statusOptions,
}: {
  totalItems: number
  languageFilter: string
  statusFilter: string
  isExporting: boolean
  onExport: () => void
  languageOptions: Option[]
  statusOptions: Option[]
}) {
  return (
    <section className="overflow-visible rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 shadow-2xl backdrop-blur-sm">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-primary-grey px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
            <Library size={16} className="text-dark-green" />
            Public Library Catalog
          </div>

          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-heading-text-black sm:text-4xl">
              Risala Catalog
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-grey sm:text-base">
              Browse risala, check availability, and manage collections.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<BookOpen size={18} />} label="Risala Found" value={String(totalItems)} />
            <SummaryCard
              icon={<Languages size={18} />}
              label="Language Filter"
              value={languageOptions.find((item) => item.value === languageFilter)?.label || 'All Languages'}
            />
            <SummaryCard
              icon={<Filter size={18} />}
              label="Status Filter"
              value={statusOptions.find((item) => item.value === statusFilter)?.label || 'All Status'}
            />
          </div>
        </div>

        <div className="relative z-20">
          <div className="rounded-[1.5rem] border border-primary-dark-grey bg-primary-grey/70 p-4 sm:p-5 h-full flex flex-col justify-center">
            <p className="text-sm font-semibold text-heading-text-black">
              Quick actions
            </p>
            <p className="mt-1 text-sm text-text-grey">
              Export the full risala catalog.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={onExport}
                disabled={isExporting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-dark-green px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Catalog
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
