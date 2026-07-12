import { supabase } from '@/lib/supabase'

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token || ''
}

export async function deleteMembersWithCleanup(memberIds: string[]) {
  const token = await getAccessToken()
  const response = await fetch('/api/delete-members', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberIds }),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete patrons.')
  return result as {
    deletedCount: number
    releasedBookCount: number
    authFailures: number
  }
}

export async function deleteBooksWithCleanup(bookIds: string[]) {
  const token = await getAccessToken()
  const response = await fetch('/api/delete-books', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookIds }),
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to delete books.')
  return result as {
    deletedCount: number
  }
}
