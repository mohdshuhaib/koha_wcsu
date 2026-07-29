'use client'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'
import Loading from '../loading'
import UpdateBookPanel from '@/components/UpdateBookPanel'
import { PlusCircle, UploadCloud, Trash2, Edit, ListX } from 'lucide-react'

export default function BooksHomePage() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showUpdatePanel, setShowUpdatePanel] = useState(false)
  const router = useRouter()

  // --- Authentication Logic (Unchanged) ---
  useEffect(() => {
    const checkAuth = async () => {
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

  if (loading) return <Loading />
  if (!isLoggedIn) return null

  // --- REDESIGNED JSX ---
  return (
    <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
            Book Management
          </h1>
          <p className="text-text-grey mt-1">Add, update, or remove books from the library catalog.</p>
        </div>

        {/* --- Modern Grid Layout for Actions --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            href="books/add"
            icon={<PlusCircle className="text-green-500" size={32} />}
            title="Add Single Book"
            description="Manually enter the details for one new book."
          />
          <ActionCard
            href="books/bulk-upload"
            icon={<UploadCloud className="text-blue-500" size={32} />}
            title="Bulk Upload Books"
            description="Upload a CSV file to add multiple books at once."
          />
          <ActionCard
            href="books/delete"
            icon={<Trash2 className="text-red-500" size={32} />}
            title="Delete a Book"
            description="Remove a single book from the catalog using its barcode."
          />
           <ActionCard
            href="books/delete-multiple"
            icon={<ListX className="text-red-700" size={32} />}
            title="Delete Multiple Books"
            description="Remove a range of books by their barcodes."
          />

          <ActionCard
            as="button"
            onClick={() => setShowUpdatePanel(true)}
            icon={<Edit className="text-yellow-500" size={32} />}
            title="Update a Book"
            description="Find a book by its barcode to edit its details."
          />
          
          <ActionCard
            href="books/add/risala"
            icon={<PlusCircle className="text-green-500" size={32} />}
            title="Add Single Risala"
            description="Manually enter the details for one new Risala."
          />
          <ActionCard
            href="books/bulk-upload/risala"
            icon={<UploadCloud className="text-blue-500" size={32} />}
            title="Bulk Upload Risala"
            description="Upload a CSV/Excel file to add multiple Risalas at once."
          />

          <ActionCard
            href="books/add/reference"
            icon={<PlusCircle className="text-green-500" size={32} />}
            title="Add Single Reference"
            description="Manually enter the details for one new Reference book."
          />
          <ActionCard
            href="books/bulk-upload/reference"
            icon={<UploadCloud className="text-blue-500" size={32} />}
            title="Bulk Upload Reference"
            description="Upload a CSV/Excel file to add multiple Reference books at once."
          />
        </div>
      </div>

      {/* The UpdateBookPanel component is called here, its functionality remains the same */}
      <UpdateBookPanel showSidebar={showUpdatePanel} setShowSidebar={setShowUpdatePanel} />
    </div>
  )
}

// --- Reusable Action Card Component ---
interface ActionCardProps {
  href?: string
  onClick?: () => void
  as?: 'link' | 'button'
  icon: ReactNode
  title: string
  description: string
}

function ActionCard({
  href,
  onClick,
  as = 'link',
  icon,
  title,
  description
}: ActionCardProps) {

  const content = (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 bg-primary-grey p-3 rounded-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold font-heading text-heading-text-black">{title}</h2>
        <p className="text-sm text-text-grey mt-1">{description}</p>
      </div>
    </div>
  );

  const cardClasses = "block w-full text-left bg-secondary-white rounded-xl p-6 shadow-md border border-primary-dark-grey transition-all duration-300 hover:shadow-xl hover:-translate-y-1"

  if (as === 'button') {
    return (
      <button onClick={onClick} className={cardClasses}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href!} className={cardClasses}>
      {content}
    </Link>
  )
}