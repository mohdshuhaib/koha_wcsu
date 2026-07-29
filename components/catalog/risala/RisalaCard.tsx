'use client'

import InfoItem from '@/components/catalog/InfoItem'
import StatusBadge from '@/components/catalog/StatusBadge'
import type { Risala } from '@/types'

export default function RisalaCard({
  item,
  getLanguageName,
}: {
  item: Risala
  getLanguageName: (code: string | null | undefined) => string
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-primary-dark-grey bg-white shadow-sm transition hover:shadow-md">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
              Barcode: {item.barcode}
            </p>
            <h2 className="mt-1 break-words font-malayalam text-lg font-bold leading-snug text-heading-text-black">
              {item.risala_name}
            </h2>
            <p className="mt-1 text-sm text-text-grey">{item.author || '-'}</p>
          </div>

          <StatusBadge status={item.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-primary-grey p-3">
          <InfoItem label="Language" value={getLanguageName(item.language)} />
          <InfoItem label="Mushrif" value={item.mushrif || '-'} />
          <InfoItem label="Department" value={item.department || '-'} />
          <InfoItem label="Year" value={item.year || '-'} />
          <InfoItem label="Section No" value={item.section_no || '-'} />
        </div>
      </div>
    </article>
  )
}
