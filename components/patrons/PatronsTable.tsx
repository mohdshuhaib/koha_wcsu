'use client'

import type { Member } from '@/app/patrons/page'

export default function PatronsTable({
  members,
}: {
  members: Member[]
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-primary-dark-grey">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-secondary-light-black text-white">
            <tr>
              <th className="px-5 py-4 font-semibold uppercase tracking-wider">
                Name
              </th>
              <th className="px-5 py-4 font-semibold uppercase tracking-wider">
                Contact
              </th>
              <th className="px-5 py-4 font-semibold uppercase tracking-wider">
                Category
              </th>
              <th className="px-5 py-4 font-semibold uppercase tracking-wider">
                Barcode
              </th>
              <th className="px-5 py-4 font-semibold uppercase tracking-wider">
                Batch
              </th>
            </tr>
          </thead>

          <tbody>
            {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-primary-dark-grey transition hover:bg-primary-grey/70 last:border-b-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-heading-text-black">{member.name}</p>
                    {member.class && <p className="text-xs text-text-grey">Class: {member.class}</p>}
                  </td>
                  <td className="px-5 py-4 text-text-grey">
                    <div>{member.ph_no || '-'}</div>
                    {member.email && <div className="text-xs">{member.email}</div>}
                  </td>
                  <td className="px-5 py-4 text-text-grey">
                    {member.category}
                  </td>
                  <td className="px-5 py-4 text-text-grey">
                    {member.barcode}
                  </td>
                  <td className="px-5 py-4 text-text-grey">
                    {member.batch}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
