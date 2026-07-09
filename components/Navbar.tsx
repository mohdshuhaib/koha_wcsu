'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Menu, X, ChevronDown, Code, Search, LibraryBig, UserCircle } from 'lucide-react'
import clsx from 'classnames'

interface NavItemType {
  href?: string
  label: string
  icon?: React.ReactNode
  children?: NavItemType[]
}

export default function Navbar() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState<'member' | 'librarian' | 'admin' | 'developer' | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState('')

  useEffect(() => {
    const getSessionAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (user) {
        setIsLoggedIn(true)
        const rawRole = user.user_metadata?.role

        setDisplayName(
          user.user_metadata?.display_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          ''
        )

        if (rawRole === 'developer') {
          setRole('developer')
        } else if (rawRole === 'librarian') {
          setRole('librarian')
        } else if (rawRole === 'admin') {
          setRole('admin')
        } else {
          setRole('member')
        }
      } else {
        setIsLoggedIn(false)
        setRole(null)
        setDisplayName('')
      }
    }

    getSessionAndRole()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getSessionAndRole()
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
    setMobileSearch('')
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
    setIsMenuOpen(false)
  }

  const navItems: NavItemType[] = useMemo(() => [
    { href: '/', label: 'Home' },
    { href: '/catalog', label: 'Catalog' },
    { href: '/patrons', label: 'Members' },

    ...(isLoggedIn ? [
      ...(role === 'developer'
        ? [
            {
              href: '/developer/dashboard-dev',
              label: 'Dev Console',
              icon: <Code size={16} className="shrink-0" />,
            },
          ]
        : []),

      ...(role === 'librarian' || role === 'admin'
        ? [{ href: '/dashboard', label: 'Dashboard' }]
        : []),

      ...(role === 'member'
        ? [{ href: '/member/dashboard-mem', label: 'Dashboard' }]
        : []),
    ] : []),

    ...(role === 'librarian' || role === 'admin'
      ? [
          { href: '/check', label: 'Check In / Out' },
          {
            label: 'Management',
            children:
              role === 'librarian'
                ? [
                    { href: '/books', label: 'Books' },
                    { href: '/members', label: 'Patrons' },
                    { href: '/admins', label: 'Admins' },
                    { href: '/fines', label: 'Fines' },
                    { href: '/periodicals', label: 'Periodicals' },
                    { href: '/barcode-generator', label: 'Barcode Generator' },
                    { href: '/dev-support', label: 'System Support' },
                  ]
                : [
                    { href: '/admins', label: 'Admins' },
                    { href: '/fines', label: 'Fines' },
                    { href: '/periodicals', label: 'Periodicals' },
                    { href: '/dev-support', label: 'System Support' },
                  ],
          },
          ...(role === 'librarian' ? [{ href: '/backup', label: 'Backup' }] : []),
          { href: '/history', label: 'Stats' },
        ]
      : []),
  ], [isLoggedIn, role])

  const mobileNavItems = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase()
    if (!query) return navItems

    return navItems
      .map((item) => {
        if (!item.children) return item.label.toLowerCase().includes(query) ? item : null

        const matchingChildren = item.children.filter((child) =>
          child.label.toLowerCase().includes(query)
        )

        if (item.label.toLowerCase().includes(query)) return item
        if (matchingChildren.length > 0) return { ...item, children: matchingChildren }
        return null
      })
      .filter(Boolean) as NavItemType[]
  }, [mobileSearch, navItems])

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-primary-dark-grey bg-secondary-white/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-secondary-white/85">
        <div className="mx-auto max-w-[96rem] px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 truncate text-base font-bold uppercase tracking-[0.16em] text-heading-text-black sm:text-lg"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dark-green text-white">
                <LibraryBig size={19} />
              </span>
              <span className="truncate">Campus Library</span>
            </Link>

            <div className="hidden items-center gap-1 lg:gap-2 md:flex">
              {navItems.map((item) => (
                <NavItem key={item.label} item={item} pathname={pathname} />
              ))}
              <div className="ml-2">
                <AuthButton isLoggedIn={isLoggedIn} handleLogout={handleLogout} displayName={displayName} />
              </div>
            </div>

            <button
              type="button"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary-dark-grey bg-primary-grey text-heading-text-black transition hover:bg-primary-dark-grey md:hidden"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden',
          isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsMenuOpen(false)}
      />

      <aside
        className={clsx(
          'fixed right-0 top-16 z-50 h-[calc(100dvh-4rem)] w-full max-w-sm transform border-l border-primary-dark-grey bg-secondary-white p-4 shadow-2xl transition-transform duration-300 md:hidden',
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="mb-4 space-y-3">
            <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sub-heading-text-grey">
                Navigation
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-grey" />
              <input
                value={mobileSearch}
                onChange={(event) => setMobileSearch(event.target.value)}
                placeholder="Search menu"
                className="h-11 w-full rounded-xl border border-primary-dark-grey bg-primary-grey pl-10 pr-3 text-sm font-medium text-heading-text-black outline-none focus:ring-2 focus:ring-dark-green"
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {mobileNavItems.length > 0 ? mobileNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                pathname={pathname}
                isMobile
                onLinkClick={() => setIsMenuOpen(false)}
              />
            )) : (
              <div className="rounded-xl border border-primary-dark-grey bg-primary-grey p-4 text-center text-sm font-medium text-text-grey">
                No menu items found.
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-primary-dark-grey pt-4">
            <AuthButton
              isLoggedIn={isLoggedIn}
              handleLogout={handleLogout}
              displayName={displayName}
              isMobile
            />
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({
  item,
  pathname,
  isMobile = false,
  onLinkClick,
}: {
  item: NavItemType
  pathname: string
  isMobile?: boolean
  onLinkClick?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isActive =
    item.href === pathname || item.children?.some((child) => child.href === pathname)

  useEffect(() => {
    if (isMobile || !isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMobile, isOpen])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  if (item.children) {
    return (
      <div
        ref={containerRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={clsx(
            'flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition',
            isMobile ? 'min-h-11' : '',
            isActive
              ? 'bg-dark-green text-white shadow-sm'
              : isMobile
                ? 'text-heading-text-black hover:bg-primary-grey'
                : 'text-text-grey hover:bg-primary-grey hover:text-heading-text-black'
          )}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          <ChevronDown
            size={16}
            className={clsx('shrink-0 transition-transform', {
              'rotate-180': isOpen,
            })}
          />
        </button>

        {isOpen && (
          <div
            className={clsx(
              'mt-2 space-y-1',
              !isMobile &&
                'absolute left-0 top-full mt-2 min-w-[230px] rounded-2xl border border-primary-dark-grey bg-secondary-white p-2 shadow-2xl'
            )}
          >
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href!}
                onClick={onLinkClick}
                className={clsx(
                  'block rounded-xl px-4 py-3 text-sm font-medium transition',
                  pathname === child.href
                    ? 'bg-dark-green text-white'
                    : 'text-text-grey hover:bg-primary-grey hover:text-heading-text-black'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      onClick={onLinkClick}
      className={clsx(
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition',
        isMobile ? 'min-h-11 w-full' : '',
        isActive
          ? 'bg-dark-green text-white shadow-sm'
          : isMobile
            ? 'text-heading-text-black hover:bg-primary-grey'
            : 'text-text-grey hover:bg-primary-grey hover:text-heading-text-black'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

function AuthButton({
  isLoggedIn,
  handleLogout,
  displayName,
  isMobile = false,
}: {
  isLoggedIn: boolean
  handleLogout: () => void
  displayName: string
  isMobile?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isMobile || !isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMobile, isOpen])

  if (isLoggedIn) {
    return (
      <div ref={ref} className={clsx('relative', isMobile ? 'w-full' : '')}>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={clsx(
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary-dark-grey bg-primary-grey px-4 py-3 text-sm font-semibold text-heading-text-black transition hover:bg-primary-dark-grey',
            isMobile ? 'w-full' : ''
          )}
        >
          <UserCircle size={18} />
          <span className="max-w-[150px] truncate">{displayName || 'Account'}</span>
          <ChevronDown size={15} className={clsx('transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div
            className={clsx(
              'mt-2 space-y-1 rounded-2xl border border-primary-dark-grey bg-secondary-white p-2 shadow-2xl',
              !isMobile && 'absolute right-0 top-full min-w-[190px]'
            )}
          >
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-text-grey transition hover:bg-primary-grey hover:text-heading-text-black"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href="/login"
      className={clsx(
        'inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition min-h-11',
        'bg-button-yellow text-button-text-black hover:bg-yellow-500',
        isMobile ? 'w-full' : ''
      )}
    >
      Login
    </Link>
  )
}
