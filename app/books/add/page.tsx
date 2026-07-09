'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Loading from '@/app/loading'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle2, PlusCircle } from 'lucide-react'
import clsx from 'classnames'

export default function AddBookPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    language: '',
    call_number: '',
    barcode: '',
    pages: '',
    price: '',
    edition: '',
    publication: '',
    status: 'available',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // --- Authentication Logic (Unchanged) ---
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setIsLoggedIn(true)
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const bookToInsert = {
      ...formData,
      pages: formData.pages.trim() ? Number(formData.pages) : null,
      price: formData.price.trim() ? Number(formData.price) : null,
      edition: formData.edition.trim() || null,
      publication: formData.publication.trim() || null,
    }

    const { error } = await supabase.from('books').insert([bookToInsert])
    if (error) {
      setError(`Failed to add book: ${error.message}`)
    } else {
      setSuccess(`Successfully added "${formData.title}" to the catalog!`)
      setFormData({
        title: '', author: '', language: '', call_number: '', barcode: '',
        pages: '', price: '', edition: '', publication: '', status: 'available',
      })
    }
    setLoading(false)
  }

  if (loading && !isLoggedIn) return <Loading />
  if (!isLoggedIn) return null

  // --- REDESIGNED JSX ---
  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-3xl mx-auto">
        <Link href="/books" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Book Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-6 text-heading-text-black uppercase font-heading tracking-wider">
            Add a New Book
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg text-sm bg-red-100 text-red-800">
                <AlertCircle size={20} />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-3 rounded-lg text-sm bg-green-100 text-green-800">
                <CheckCircle2 size={20} />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* --- Modern Grid Layout for Form Fields --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-semibold text-text-grey mb-1">Title</label>
                <input id="title" name="title" value={formData.title} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-semibold text-text-grey mb-1">Author</label>
                <input id="author" name="author" value={formData.author} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-semibold text-text-grey mb-1">Language</label>
                <select id="language" name="language" value={formData.language} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green">
                  <option value="">Select Language</option>
                  <option value="ENG">ENG</option>
                  <option value="MAL">MAL</option>
                  <option value="ARB">ARB</option>
                  <option value="URD">URD</option>
                </select>
              </div>

              <div>
                <label htmlFor="call_number" className="block text-sm font-semibold text-text-grey mb-1">Call Number</label>
                <input id="call_number" name="call_number" placeholder="e.g., 813.2/HNK" value={formData.call_number} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-semibold text-text-grey mb-1">Price <span className="font-normal">(optional)</span></label>
                <input id="price" name="price" type="number" min="0" step="0.01" placeholder="e.g., 250" value={formData.price} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="edition" className="block text-sm font-semibold text-text-grey mb-1">Edition <span className="font-normal">(optional)</span></label>
                <input id="edition" name="edition" placeholder="e.g., 2nd Edition" value={formData.edition} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="publication" className="block text-sm font-semibold text-text-grey mb-1">Publication <span className="font-normal">(optional)</span></label>
                <input id="publication" name="publication" placeholder="Publisher or publication name" value={formData.publication} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="barcode" className="block text-sm font-semibold text-text-grey mb-1">Barcode</label>
                <input id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pages" className="block text-sm font-semibold text-text-grey mb-1">Pages <span className="font-normal">(optional)</span></label>
                <input id="pages" name="pages" type="number" min="1" placeholder="Leave empty if not known" value={formData.pages} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

               {/* Status is preset, so it can be a hidden field or removed if always 'available' on add */}
               {/* <input type="hidden" name="status" value={formData.status} /> */}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-button-yellow text-button-text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition disabled:opacity-60"
              >
                <PlusCircle size={20} />
                {loading ? 'Adding...' : 'Add Book'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
