'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'classnames'
import { RankedItem } from '@/types'

interface Props {
  title: string
  icon: ReactNode
  data: RankedItem[]
  unit: string // ✅ FIX: Added 'unit' to the interface
  showPagesToggle?: boolean
}

export default function LeaderboardCard({ title, icon, data, unit, showPagesToggle = false }: Props) {
  const [mode, setMode] = useState<'count' | 'pages'>('count')
  const [isExpanded, setIsExpanded] = useState(false)
  const medals = ['🥇', '🥈', '🥉']

  // Sort data dynamically based on the selected mode
  const sortedData = [...data].sort((a, b) => {
    if (mode === 'count') return b.count - a.count
    return (b.totalPages || 0) - (a.totalPages || 0)
  })

  const itemsToShow = isExpanded ? sortedData.slice(0, 10) : sortedData.slice(0, 3)

  return (
    <div className="bg-secondary-white border border-primary-dark-grey rounded-xl p-6 shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-grey p-2 rounded-full">{icon}</div>
          <h2 className="text-lg font-bold text-heading-text-black uppercase tracking-wider">{title}</h2>
        </div>
      </div>

      {showPagesToggle && (
        <div className="flex bg-primary-grey rounded-lg p-1 mb-4">
          <button
            onClick={() => setMode('count')}
            className={clsx("flex-1 py-1 text-xs font-bold rounded-md transition", mode === 'count' ? 'bg-white shadow text-black' : 'text-text-grey hover:text-black')}
          >
            By Books
          </button>
          <button
            onClick={() => setMode('pages')}
            className={clsx("flex-1 py-1 text-xs font-bold rounded-md transition", mode === 'pages' ? 'bg-white shadow text-black' : 'text-text-grey hover:text-black')}
          >
            By Pages
          </button>
        </div>
      )}

      <ul className="space-y-3 text-text-grey flex-grow">
        {itemsToShow.map((item, i) => (
          <li key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-primary-grey transition">
            <span className="flex items-center gap-3">
              <span className="text-lg w-6 text-center font-mono">{medals[i] || `${i + 1}.`}</span>
              <span className={clsx("font-semibold text-heading-text-black max-w-[120px] sm:max-w-[150px]", title === 'Top Books' && 'font-malayalam')} title={item.name}>
                {item.name}
              </span>
            </span>
            <div className="text-right">
              {mode === 'count' ? (
                // ✅ FIX: Uses the 'unit' prop here (e.g., "books" or "loans")
                <span className="font-bold text-sm">{item.count} <span className="font-normal text-xs opacity-70">{unit}</span></span>
              ) : (
                <span className="font-bold text-sm">{(item.totalPages || 0).toLocaleString()} <span className="font-normal text-xs opacity-70">pages</span></span>
              )}
            </div>
          </li>
        ))}
        {sortedData.length === 0 && <li className="text-center text-sm p-4 opacity-50">No data available.</li>}
      </ul>

      {sortedData.length > 3 && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 uppercase tracking-wide">
          {isExpanded ? <>Show Less <ChevronUp size={14} /></> : <>View Top 10 <ChevronDown size={14} /></>}
        </button>
      )}
    </div>
  )
}
