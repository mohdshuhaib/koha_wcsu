'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import { AlertTriangle, Edit, Plus, Save, Trash2, UserCog, X } from 'lucide-react'

type AdminUser = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

type NewAdminForm = {
  name: string
  phone: string
  email: string
  password: string
}

const emptyForm: NewAdminForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : '#'
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token || ''
}

export default function AdminsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState<NewAdminForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null)

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      if (session.user.user_metadata?.role !== 'librarian') {
        router.push('/dashboard')
        return
      }

      await fetchAdmins()
      setLoading(false)
    }

    checkAccessAndFetch()
  }, [router])

  const fetchAdmins = async () => {
    const token = await getAccessToken()
    const response = await fetch('/api/admins', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()

    if (!response.ok) {
      setMessage(data.error || 'Failed to load admins.')
      return
    }

    setAdmins(data.admins || [])
  }

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (form.password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    setSaving(true)
    const token = await getAccessToken()
    const response = await fetch('/api/admins', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    })
    const data = await response.json()
    setSaving(false)

    if (!response.ok) {
      setMessage(data.error || 'Failed to create admin.')
      return
    }

    setAdmins((prev) => [...prev, data.admin].sort((a, b) => a.name.localeCompare(b.name)))
    setForm(emptyForm)
    setIsAddOpen(false)
  }

  const startEdit = (admin: AdminUser) => {
    setEditingId(admin.id)
    setEditingName(admin.name)
  }

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return
    setSaving(true)
    setMessage('')
    const token = await getAccessToken()
    const response = await fetch('/api/admins', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: editingId, name: editingName }),
    })
    const data = await response.json()
    setSaving(false)

    if (!response.ok) {
      setMessage(data.error || 'Failed to update admin.')
      return
    }

    setAdmins((prev) =>
      prev.map((admin) => (admin.id === editingId ? { ...admin, name: data.admin.name } : admin))
    )
    setEditingId(null)
    setEditingName('')
  }

  const deleteAdmin = async () => {
    if (!adminToDelete) return
    setSaving(true)
    setMessage('')
    const token = await getAccessToken()
    const response = await fetch(`/api/admins/${adminToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    setSaving(false)

    if (!response.ok) {
      setMessage(data.error || 'Failed to delete admin.')
      return
    }

    setAdmins((prev) => prev.filter((admin) => admin.id !== adminToDelete.id))
    setAdminToDelete(null)
  }

  const tableRows = useMemo(() => admins, [admins])

  if (loading) return <Loading />

  return (
    <>
      <main className="min-h-screen bg-primary-grey px-4 pb-10 pt-24">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold uppercase tracking-wider text-heading-text-black md:text-4xl">
                Admins
              </h1>
              <p className="mt-1 text-text-grey">
                Add and manage librarian admin accounts for daily library operations.
              </p>
            </div>

            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-button-yellow px-5 py-3 text-sm font-bold text-button-text-black shadow-md transition hover:bg-yellow-500"
            >
              <Plus size={18} />
              Add Admin
            </button>
          </div>

          {message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {message}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-primary-dark-grey bg-secondary-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary-light-black text-white">
                  <tr>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">SL No</th>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Name</th>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Email</th>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Phone</th>
                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length > 0 ? (
                    tableRows.map((admin, index) => (
                      <tr key={admin.id} className="border-b border-primary-dark-grey last:border-b-0 hover:bg-primary-grey">
                        <td className="p-3 text-text-grey">{index + 1}</td>
                        <td className="p-3">
                          {editingId === admin.id ? (
                            <input
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              className="w-full rounded-lg border border-primary-dark-grey bg-white p-2 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
                            />
                          ) : (
                            <span className="font-semibold text-heading-text-black">{admin.name || '-'}</span>
                          )}
                        </td>
                        <td className="p-3 text-text-grey">{admin.email}</td>
                        <td className="p-3">
                          <a
                            href={whatsappUrl(admin.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-dark-green hover:underline"
                          >
                            {admin.phone || '-'}
                          </a>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            {editingId === admin.id ? (
                              <>
                                <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-dark-green p-2 text-white transition hover:bg-icon-green disabled:opacity-70" title="Save name">
                                  <Save size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="rounded-lg border border-primary-dark-grey bg-white p-2 text-text-grey transition hover:bg-primary-dark-grey" title="Cancel edit">
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => startEdit(admin)} className="rounded-lg border border-primary-dark-grey bg-white p-2 text-text-grey transition hover:bg-primary-dark-grey" title="Edit name">
                                <Edit size={16} />
                              </button>
                            )}
                            <button onClick={() => setAdminToDelete(admin)} className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700" title="Delete admin">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-text-grey">
                        <UserCog className="mx-auto mb-3 h-10 w-10" />
                        No admin accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-primary-dark-grey bg-secondary-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary-dark-grey p-4">
              <h2 className="font-heading text-lg font-bold text-heading-text-black">Add New Admin</h2>
              <button onClick={() => setIsAddOpen(false)} className="rounded-full p-1 text-text-grey hover:bg-primary-dark-grey">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 p-5">
              <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
              <Input label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                required
                helper="Minimum 6 characters. Any characters are allowed."
              />

              <div className="flex justify-end gap-3 border-t border-primary-dark-grey pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="rounded-lg border border-primary-dark-grey bg-white px-5 py-2 text-sm font-semibold hover:bg-primary-grey">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-dark-green px-5 py-2 text-sm font-semibold text-white hover:bg-icon-green disabled:opacity-70">
                  {saving ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-primary-dark-grey bg-secondary-white shadow-2xl">
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-4 font-heading text-xl font-bold text-heading-text-black">
                Delete Admin?
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-grey">
                Deleting this admin will permanently remove their login account and clear their
                staff attribution from check-in, check-out, renewal, hold, periodical, and fine
                payment history. The library transactions themselves will remain saved.
              </p>
            </div>
            <div className="flex justify-end gap-3 bg-primary-grey p-4">
              <button onClick={() => setAdminToDelete(null)} disabled={saving} className="rounded-lg border border-primary-dark-grey bg-white px-5 py-2 text-sm font-semibold hover:bg-primary-dark-grey disabled:opacity-70">
                No
              </button>
              <button onClick={deleteAdmin} disabled={saving} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70">
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  helper,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  helper?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text-grey">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
      />
      {helper && <p className="mt-1 text-xs text-text-grey">{helper}</p>}
    </div>
  )
}
