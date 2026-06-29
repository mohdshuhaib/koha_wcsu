'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteAuthUserByEmail } from '@/app/actions/deleteMember'

export default function DeleteAllMembers() {
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDeleteAll = async () => {
    if (confirm !== 'DELETE') {
      return setMessage('Type DELETE to confirm.')
    }

    // 1. Get all members
    const { data: members } = await supabase.from('members').select('id, barcode')

    if (!members?.length) return setMessage('No members found.')

    const memberIds = members.map((m) => m.id)
    setLoading(true)

    // 2. Delete borrow records
    await supabase.from('borrow_records').delete().in('member_id', memberIds)
    await supabase.from('hold_records').delete().in('member_id', memberIds)

    // 3. Delete members
    await supabase.from('members').delete().in('id', memberIds)

    // 4. Delete auth users
    for (const m of members) {
      await deleteAuthUserByEmail(`${m.barcode.toLowerCase()}@member.wcsu`)
    }

    setMessage('All members, borrow records, and user accounts deleted.')
    setConfirm('')
  }

  return (
    <main className="min-h-screen pt-28 px-4 pb-10 bg-primary-grey">
      <div className="max-w-lg mx-auto bg-secondary-white p-6 md:p-8 rounded-2xl shadow-2xl border border-primary-dark-grey space-y-6">
        <h1 className="text-3xl uppercase font-bold text-center text-heading-text-black">
          Delete ALL Members & Records
        </h1>

        <p className="text-sub-heading-text-grey">
          This action is irreversible. Type <code className="bg-secondary-light-black px-1 py-0.5 rounded text-red-600">DELETE</code> below to confirm:
        </p>

        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type DELETE here"
          className="w-full p-3 bg-secondary-white border border-red-600 rounded-lg text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-red-700 transition"
        />

        <button
          onClick={handleDeleteAll}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete Everything'}
        </button>

        {message && (
          <p className="text-sm text-text-grey mt-2">{message}</p>
        )}
      </div>
    </main>
  )
}
