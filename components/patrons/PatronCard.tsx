'use client'

import { UserSquare, Barcode, Calendar } from 'lucide-react'
import type { Member } from '@/app/patrons/page'

export default function PatronCard({
  member,
}: {
  member: Member
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-primary-dark-grey bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="space-y-4">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-heading-text-black">
            {member.name}
          </h2>
          <p className="mt-1 text-sm text-text-grey">
            Registered library patron
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl bg-primary-grey p-3">
          <div className="flex items-center gap-3 text-sm text-text-grey">
            <UserSquare size={16} className="shrink-0 text-dark-green" />
            <span className="font-medium">{member.category}</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-text-grey">
            <Barcode size={16} className="shrink-0 text-dark-green" />
            <span className="font-medium">{member.barcode}</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-text-grey">
            <Calendar size={16} className="shrink-0 text-dark-green" />
            <span className="font-medium">{member.batch}</span>
          </div>

          {member.class && (
            <div className="text-sm text-text-grey">
              <span className="font-semibold text-heading-text-black">Class:</span> {member.class}
            </div>
          )}

          {member.ph_no && (
            <div className="text-sm text-text-grey">
              <span className="font-semibold text-heading-text-black">Phone:</span> {member.ph_no}
            </div>
          )}

          {member.email && (
            <div className="break-words text-sm text-text-grey">
              <span className="font-semibold text-heading-text-black">Email:</span> {member.email}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
