'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import CheckOutForm from './CheckOutForm'
import CheckInForm from './CheckInForm'
import RenewBookForm from './RenewBookForm'
import HoldSection from './HoldSection' // A new component to manage the Hold tabs
import { ArrowUpRight, LogIn, Repeat, Library } from 'lucide-react'
import clsx from 'classnames'

type Tab = 'checkout' | 'checkin' | 'renew' | 'hold'

export default function CheckPage() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('checkout')
  const router = useRouter()

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

  useEffect(() => {
    const shortcuts: Record<string, Tab> = {
      o: 'checkout',
      i: 'checkin',
      r: 'renew',
      h: 'hold',
    }

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tagName = target.tagName.toLowerCase()

      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTypingTarget(event.target)
      ) {
        return
      }

      const nextTab = shortcuts[event.key.toLowerCase()]
      if (!nextTab) return

      event.preventDefault()
      setActiveTab(nextTab)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'checkout': return <CheckOutForm />
      case 'checkin': return <CheckInForm />
      case 'renew': return <RenewBookForm />
      case 'hold': return <HoldSection />
      default: return null
    }
  }

  if (loading) return <Loading />
  if (!isLoggedIn) return null

  return (
    <main className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
            Circulation Desk
          </h1>
          <p className="text-text-grey mt-1">Manage all borrowing, returning, and renewal tasks.</p>
        </div>

        {/* --- Tab Navigation --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <TabButton
            label="Check Out"
            shortcutKey="O"
            icon={<ArrowUpRight size={18} />}
            isActive={activeTab === 'checkout'}
            onClick={() => setActiveTab('checkout')}
          />
          <TabButton
            label="Check In"
            shortcutKey="I"
            icon={<LogIn size={18} />}
            isActive={activeTab === 'checkin'}
            onClick={() => setActiveTab('checkin')}
          />
          <TabButton
            label="Renew Book"
            shortcutKey="R"
            icon={<Repeat size={18} />}
            isActive={activeTab === 'renew'}
            onClick={() => setActiveTab('renew')}
          />
          <TabButton
            label="Hold Books"
            shortcutKey="H"
            icon={<Library size={18} />}
            isActive={activeTab === 'hold'}
            onClick={() => setActiveTab('hold')}
          />
        </div>

        {/* --- Tab Content --- */}
        <div className="bg-secondary-white border border-primary-dark-grey rounded-2xl shadow-xl p-6 md:p-8 min-h-[50vh]">
          {renderContent()}
        </div>
      </div>
    </main>
  )
}

// Reusable Tab Button Component
function TabButton({ label, shortcutKey, icon, isActive, onClick }: { label: string, shortcutKey: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center gap-2 p-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all duration-200",
        isActive
          ? 'bg-dark-green text-white shadow-lg'
          : 'bg-secondary-white text-text-grey hover:bg-primary-dark-grey hover:text-heading-text-black border border-primary-dark-grey'
      )}
    >
      {icon}
      <span>{label}</span>
      <kbd
        className={clsx(
          'ml-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black leading-none',
          isActive
            ? 'border-white/40 bg-white/15 text-white'
            : 'border-primary-dark-grey bg-primary-grey text-text-grey'
        )}
      >
        {shortcutKey}
      </kbd>
    </button>
  )
}
