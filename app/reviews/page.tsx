'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import dayjs from 'dayjs'
import { AlertTriangle, Edit, Search, Star, Trash2, X } from 'lucide-react'
import clsx from 'classnames'

type Review = {
  id: string
  book_id: string
  reviewer_name: string
  reviewer_role: string | null
  comment: string | null
  rating: number
  created_at: string
  approved: boolean | null
  books: {
    title: string
    author: string | null
    barcode: string
  } | null
}

type EditState = {
  reviewer_name: string
  reviewer_role: string
  comment: string
  rating: number
  approved: boolean
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token || ''
}

export default function ReviewsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [editForm, setEditForm] = useState<EditState | null>(null)
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
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

      setCheckingSession(false)
      await fetchReviews()
    }

    checkAccess()
  }, [router])

  const fetchReviews = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('book_reviews')
      .select('id, book_id, reviewer_name, reviewer_role, comment, rating, created_at, approved, books(title, author, barcode)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Review fetch error:', error)
      setMessage('Could not load reviews.')
      setReviews([])
    } else {
      setReviews((data as any) || [])
    }

    setLoading(false)
  }

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reviews

    return reviews.filter((review) =>
      review.reviewer_name.toLowerCase().includes(query) ||
      (review.reviewer_role || '').toLowerCase().includes(query) ||
      (review.comment || '').toLowerCase().includes(query) ||
      (review.books?.title || '').toLowerCase().includes(query) ||
      (review.books?.author || '').toLowerCase().includes(query) ||
      (review.books?.barcode || '').toLowerCase().includes(query)
    )
  }, [reviews, search])

  const openEdit = (review: Review) => {
    setEditingReview(review)
    setEditForm({
      reviewer_name: review.reviewer_name,
      reviewer_role: review.reviewer_role || '',
      comment: review.comment || '',
      rating: review.rating,
      approved: review.approved !== false,
    })
  }

  const saveReview = async () => {
    if (!editingReview || !editForm) return

    if (!editForm.reviewer_name.trim()) {
      setMessage('Reviewer name is required.')
      return
    }

    if (editForm.rating < 1 || editForm.rating > 5) {
      setMessage('Rating must be between 1 and 5.')
      return
    }

    setSaving(true)
    setMessage('')
    const token = await getAccessToken()
    const response = await fetch(`/api/reviews/${editingReview.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewer_name: editForm.reviewer_name.trim(),
        reviewer_role: editForm.reviewer_role.trim() || null,
        comment: editForm.comment.trim() || null,
        rating: editForm.rating,
        approved: editForm.approved,
      }),
    })
    const result = await response.json()

    setSaving(false)

    if (!response.ok) {
      setMessage(result.error || 'Could not update this review.')
      return
    }

    setEditingReview(null)
    setEditForm(null)
    await fetchReviews()
  }

  const toggleApproved = async (review: Review) => {
    const nextApproved = review.approved === false
    const token = await getAccessToken()
    const response = await fetch(`/api/reviews/${review.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ approved: nextApproved }),
    })
    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error || 'Could not update review visibility.')
      return
    }

    setReviews((prev) =>
      prev.map((item) => (item.id === review.id ? { ...item, approved: nextApproved } : item))
    )
  }

  const deleteReview = async () => {
    if (!reviewToDelete) return

    setSaving(true)
    setMessage('')
    const token = await getAccessToken()
    const response = await fetch(`/api/reviews/${reviewToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json()
    setSaving(false)

    if (!response.ok) {
      setMessage(result.error || 'Could not delete this review.')
      return
    }

    setReviews((prev) => prev.filter((review) => review.id !== reviewToDelete.id))
    setReviewToDelete(null)
  }

  if (checkingSession || loading) return <Loading />

  return (
    <>
      <main className="min-h-screen bg-primary-grey px-4 pb-10 pt-24">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold uppercase tracking-wider text-heading-text-black md:text-4xl">
                Reviews
              </h1>
              <p className="mt-1 text-text-grey">
                Review, edit, approve, or delete feedback received from readers.
              </p>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {message}
            </div>
          )}

          <div className="rounded-xl border border-primary-dark-grey bg-secondary-white p-4 shadow-lg">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-grey" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by book, reviewer, barcode, or comment"
                className="w-full rounded-xl border border-primary-dark-grey bg-primary-grey py-3 pl-11 pr-4 text-sm text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-primary-dark-grey bg-secondary-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary-light-black text-white">
                  <tr>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Book</th>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Reviewer</th>
                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Rating</th>
                    <th className="p-3 text-left font-semibold uppercase tracking-wider">Comment</th>
                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Status</th>
                    <th className="p-3 text-center font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.length > 0 ? filteredReviews.map((review) => (
                    <tr key={review.id} className="border-b border-primary-dark-grey last:border-b-0 hover:bg-primary-grey">
                      <td className="p-3 align-top">
                        <p className="font-malayalam font-semibold text-heading-text-black">{review.books?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-text-grey">{review.books?.author || '-'}</p>
                        <p className="text-xs text-text-grey">Barcode: {review.books?.barcode || '-'}</p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-semibold text-heading-text-black">{review.reviewer_name}</p>
                        <p className="text-xs text-text-grey">{review.reviewer_role || '-'}</p>
                        <p className="text-xs text-text-grey">{dayjs(review.created_at).format('DD MMM YYYY')}</p>
                      </td>
                      <td className="p-3 align-top text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 font-bold text-yellow-800">
                          <Star size={14} fill="currentColor" />
                          {review.rating}
                        </span>
                      </td>
                      <td className="max-w-md p-3 align-top text-text-grey">
                        {review.comment || '-'}
                      </td>
                      <td className="p-3 align-top text-center">
                        <button
                          onClick={() => toggleApproved(review)}
                          className={clsx(
                            'rounded-full px-3 py-1 text-xs font-bold transition',
                            review.approved === false
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          )}
                        >
                          {review.approved === false ? 'Hidden' : 'Visible'}
                        </button>
                      </td>
                      <td className="p-3 align-top">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(review)} className="rounded-lg border border-primary-dark-grey bg-white p-2 text-text-grey transition hover:bg-primary-dark-grey" title="Edit review">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setReviewToDelete(review)} className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700" title="Delete review">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-text-grey">No reviews found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {editingReview && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-primary-dark-grey bg-secondary-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary-dark-grey p-4">
              <h2 className="font-heading text-lg font-bold text-heading-text-black">Edit Review</h2>
              <button onClick={() => setEditingReview(null)} className="rounded-full p-1 text-text-grey hover:bg-primary-dark-grey">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <Input label="Reviewer Name" value={editForm.reviewer_name} onChange={(value) => setEditForm({ ...editForm, reviewer_name: value })} />
              <Input label="Reviewer Role" value={editForm.reviewer_role} onChange={(value) => setEditForm({ ...editForm, reviewer_role: value })} />
              <div>
                <label className="mb-1 block text-sm font-semibold text-text-grey">Rating</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editForm.rating}
                  onChange={(event) => setEditForm({ ...editForm, rating: Number(event.target.value) })}
                  className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-text-grey">Comment</label>
                <textarea
                  value={editForm.comment}
                  onChange={(event) => setEditForm({ ...editForm, comment: event.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 outline-none focus:ring-2 focus:ring-dark-green"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-heading-text-black">
                <input
                  type="checkbox"
                  checked={editForm.approved}
                  onChange={(event) => setEditForm({ ...editForm, approved: event.target.checked })}
                  className="accent-green-700"
                />
                Visible in catalog
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-primary-dark-grey bg-primary-grey p-4">
              <button onClick={() => setEditingReview(null)} className="rounded-lg border border-primary-dark-grey bg-white px-5 py-2 text-sm font-semibold hover:bg-primary-dark-grey">Cancel</button>
              <button onClick={saveReview} disabled={saving} className="rounded-lg bg-dark-green px-5 py-2 text-sm font-semibold text-white hover:bg-icon-green disabled:opacity-70">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-primary-dark-grey bg-secondary-white shadow-2xl">
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-4 font-heading text-xl font-bold text-heading-text-black">Delete Review?</h3>
              <p className="mt-2 text-sm leading-6 text-text-grey">
                This will permanently delete the review from the catalog.
              </p>
            </div>
            <div className="flex justify-end gap-3 bg-primary-grey p-4">
              <button onClick={() => setReviewToDelete(null)} disabled={saving} className="rounded-lg border border-primary-dark-grey bg-white px-5 py-2 text-sm font-semibold hover:bg-primary-dark-grey disabled:opacity-70">Cancel</button>
              <button onClick={deleteReview} disabled={saving} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70">
                {saving ? 'Deleting...' : 'Delete'}
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text-grey">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-primary-dark-grey bg-primary-grey p-3 outline-none focus:ring-2 focus:ring-dark-green"
      />
    </div>
  )
}
