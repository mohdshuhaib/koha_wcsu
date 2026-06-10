'use client'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'
import Loading from '../loading'
import {
  Users,
  UserPlus,
  UploadCloud,
  UserX,
  ListX,
  Edit
} from 'lucide-react'

export default function MemberPage() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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
            Patron Management
          </h1>
          <p className="text-text-grey mt-1">Add, update, or remove library members.</p>
        </div>

        {/* --- Modern Grid Layout for Actions --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            href="/members/patrons-status"
            icon={<Users className="text-indigo-500" size={32} />}
            title="View All Patrons"
            description="See a complete list of all library members and their status."
          />
          <ActionCard
            href="/members/addpatron"
            icon={<UserPlus className="text-green-500" size={32} />}
            title="Add Single Patron"
            description="Manually enter the details for one new library member."
          />
          <ActionCard
            href="/members/bulkpatron"
            icon={<UploadCloud className="text-blue-500" size={32} />}
            title="Bulk Upload Patrons"
            description="Upload a CSV file to add multiple members at once."
          />
           <ActionCard
            href="/members/delete"
            icon={<UserX className="text-red-500" size={32} />}
            title="Delete a Patron"
            description="Remove a member from the system using their barcode."
          />
           <ActionCard
            href="/members/delete-multiple"
            icon={<ListX className="text-red-700" size={32} />}
            title="Delete Multiple Patrons"
            description="Remove a range of patrons by their barcodes."
          />
          <ActionCard
            href="/members/update"
            icon={<Edit className="text-yellow-500" size={32} />}
            title="Update Patrons"
            description="Update one patron or rename a whole batch."
          />
        </div>
      </div>
    </div>
  )
}

// --- Reusable Action Card Component ---
interface ActionCardProps {
  href?: string
  icon: ReactNode
  title: string
  description: string
}

function ActionCard({
  href,
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

  return (
    <Link href={href!} className={cardClasses}>
      {content}
    </Link>
  )
}
