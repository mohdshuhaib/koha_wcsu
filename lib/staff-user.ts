import { supabase } from '@/lib/supabase'

export type StaffUser = {
  id: string
  email: string
  role: 'librarian' | 'admin' | 'developer' | 'member'
  displayName: string
  phone: string
}

export async function getCurrentStaffUser(): Promise<StaffUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const role = (user.user_metadata?.role || 'member') as StaffUser['role']
  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Library Staff'

  return {
    id: user.id,
    email: user.email || '',
    role,
    displayName,
    phone: user.user_metadata?.phone || '',
  }
}
