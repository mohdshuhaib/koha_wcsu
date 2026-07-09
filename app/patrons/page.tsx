'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'

import PatronsHeader from '@/components/patrons/PatronsHeader'
import PatronsSearch from '@/components/patrons/PatronsSearch'
import PatronsTable from '@/components/patrons/PatronsTable'
import PatronCard from '@/components/patrons/PatronCard'
import PatronsEmptyState from '@/components/patrons/PatronsEmptyState'

export type Member = {
  id: string
  name: string
  category: string
  barcode: string
  batch: string
  ph_no: string | null
  address: string | null
  dob: string | null
  email: string | null
  class: string | null
  image_link: string | null
}

export default function PatronsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true })

      if (!error && data) {
        setMembers(data)
      } else {
        setMembers([])
      }

      setLoading(false)
    }

    fetchMembers()
  }, [])

  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase().trim()

    if (!query) return members

    return members.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      m.barcode.toLowerCase().includes(query) ||
      m.batch.toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query) ||
      (m.ph_no || '').toLowerCase().includes(query) ||
      (m.class || '').toLowerCase().includes(query)
    )
  }, [search, members])

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-grey px-4 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl py-12">
          <Loading />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-grey px-4 pb-8 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PatronsHeader
          totalMembers={members.length}
          filteredCount={filteredMembers.length}
        />

        <PatronsSearch
          search={search}
          setSearch={setSearch}
          totalMembers={filteredMembers.length}
        />

        <section className="rounded-[2rem] border border-primary-dark-grey/70 bg-secondary-white/90 p-4 shadow-xl sm:p-5 lg:p-6">
          {filteredMembers.length === 0 ? (
            <PatronsEmptyState search={search} />
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {filteredMembers.map((member) => (
                  <PatronCard key={member.id} member={member} />
                ))}
              </div>

              <div className="hidden md:block">
                <PatronsTable members={filteredMembers} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
