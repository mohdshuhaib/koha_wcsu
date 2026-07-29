'use client'

import StatusBadge from '@/components/catalog/StatusBadge'
import type { Risala } from '@/types'

export default function RisalaDesktopRows({
  item,
  getLanguageName,
}: {
  item: Risala
  getLanguageName: (code: string | null | undefined) => string
}) {
  return (
    <tr className="border-b border-primary-dark-grey transition hover:bg-primary-grey/70">
      <td className="px-4 py-4 align-top text-text-grey">{item.barcode}</td>
      <td className="px-4 py-4 align-top">
        <div className="font-malayalam font-semibold text-heading-text-black">
          {item.risala_name}
        </div>
      </td>
      <td className="px-4 py-4 align-top font-malayalam text-text-grey">
        {item.author || '-'}
      </td>
      <td className="px-4 py-4 align-top text-text-grey">
        {getLanguageName(item.language)}
      </td>
      <td className="px-4 py-4 align-top text-text-grey">
        {item.mushrif || '-'}
      </td>
      <td className="px-4 py-4 align-top text-text-grey">
        {item.department || '-'}
      </td>
      <td className="px-4 py-4 align-top text-text-grey">
        {item.year || '-'}
      </td>
      <td className="px-4 py-4 align-top text-text-grey">
        {item.section_no || '-'}
      </td>
      <td className="px-4 py-4 align-top">
        <StatusBadge status={item.status} />
      </td>
    </tr>
  )
}
