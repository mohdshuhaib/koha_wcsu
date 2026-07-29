'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Loading from '@/app/loading'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle2, PlusCircle } from 'lucide-react'

export default function AddRisalaPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    risala_name: '',
    author: '',
    language: '',
    mushrif: '',
    department: '',
    year: '',
    section_no: '',
    barcode: '',
    status: 'available',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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

    const dataToInsert = {
      ...formData,
      author: formData.author.trim() || null,
      mushrif: formData.mushrif.trim() || null,
      department: formData.department.trim() || null,
      year: formData.year.trim() || null,
      section_no: formData.section_no.trim() || null,
    }

    const { error } = await supabase.from('risala').insert([dataToInsert])
    if (error) {
      setError(`Failed to add risala: ${error.message}`)
    } else {
      setSuccess(`Successfully added "${formData.risala_name}" to the catalog!`)
      setFormData({
        risala_name: '', author: '', language: '', mushrif: '', department: '',
        year: '', section_no: '', barcode: '', status: 'available',
      })
    }
    setLoading(false)
  }

  if (loading && !isLoggedIn) return <Loading />
  if (!isLoggedIn) return null

  return (
    <main className="min-h-screen pt-24 px-4 pb-10 bg-primary-grey">
      <div className="max-w-3xl mx-auto">
        <Link href="/books" className="flex items-center gap-2 text-text-grey font-semibold hover:text-heading-text-black transition mb-4">
          <ArrowLeft size={18} />
          Back to Book Management
        </Link>
        <div className="bg-secondary-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary-dark-grey">
          <h1 className="text-2xl font-bold mb-6 text-heading-text-black uppercase font-heading tracking-wider">
            Add a New Risala
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <label htmlFor="risala_name" className="block text-sm font-semibold text-text-grey mb-1">Risala Name</label>
                <input id="risala_name" name="risala_name" value={formData.risala_name} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-semibold text-text-grey mb-1">Author <span className="font-normal">(optional)</span></label>
                <input id="author" name="author" value={formData.author} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
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
                <label htmlFor="mushrif" className="block text-sm font-semibold text-text-grey mb-1">Mushrif <span className="font-normal">(optional)</span></label>
                <input id="mushrif" name="mushrif" value={formData.mushrif} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-semibold text-text-grey mb-1">Department <span className="font-normal">(optional)</span></label>
                <input id="department" name="department" value={formData.department} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-semibold text-text-grey mb-1">Year <span className="font-normal">(optional)</span></label>
                <input id="year" name="year" value={formData.year} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div>
                <label htmlFor="section_no" className="block text-sm font-semibold text-text-grey mb-1">Section No <span className="font-normal">(optional)</span></label>
                <input id="section_no" name="section_no" value={formData.section_no} onChange={handleChange} className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="barcode" className="block text-sm font-semibold text-text-grey mb-1">Barcode</label>
                <input id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} required className="w-full p-3 rounded-lg bg-primary-grey border border-primary-dark-grey text-text-grey placeholder-text-grey focus:outline-none focus:ring-2 focus:ring-dark-green" />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-button-yellow text-button-text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition disabled:opacity-60"
              >
                <PlusCircle size={20} />
                {loading ? 'Adding...' : 'Add Risala'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
