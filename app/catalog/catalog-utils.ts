export type BookReview = {
  id: string
  reviewer_name: string
  reviewer_role: string | null
  comment: string | null
  rating: number
  created_at: string
  approved?: boolean
}

export type Book = {
  id: string
  barcode: string
  title: string
  author: string | null
  language: 'MAL' | 'ENG' | 'ARB' | 'URD' | string | null
  call_number: string | null
  shelf_location: string | null
  pages: number | null
  status: 'available' | 'borrowed' | 'held'
  borrow_records?: {
    return_date: string | null
    members: {
      name: string
    } | null
  }[]
  hold_records?: {
    released: boolean
    hold_date: string
    member: {
      name: string
    } | null
  }[]
  book_reviews?: BookReview[]
}

export type ReviewFormState = {
  reviewer_name: string
  reviewer_role: string
  comment: string
  rating: number
}

export const PAGE_SIZE = 20

export const LANGUAGE_OPTIONS = [
  { label: 'All Languages', value: 'ALL' },
  { label: 'Malayalam', value: 'MAL' },
  { label: 'English', value: 'ENG' },
  { label: 'Arabic', value: 'ARB' },
  { label: 'Urdu', value: 'URD' },
]

export const STATUS_OPTIONS = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Available', value: 'available' },
  { label: 'Checked Out', value: 'borrowed' },
  { label: 'Held', value: 'held' },
]

export const SORT_OPTIONS = [
  { label: 'Barcode (Default)', value: 'barcode' },
  { label: 'Top Rated', value: 'top_rated' },
  { label: 'Most Reviewed', value: 'most_reviewed' },
  { label: 'Title A-Z', value: 'title_asc' },
]

export const CATALOG_LINKS = [
  {
    label: 'Malayalam Books Catalogue',
    url: 'https://docs.google.com/spreadsheets/d/1kA9HfMhkLo9n-Vsa-xstVD6NtS9V8mRg/edit?usp=sharing&ouid=117954835367113518356&rtpof=true&sd=true',
  },
  {
    label: 'English Books Catalogue',
    url: 'https://docs.google.com/spreadsheets/d/1DHq4BNL7B2FJTCeifCpfPot4cUl3Dujt/edit?usp=sharing&ouid=117954835367113518356&rtpof=true&sd=true',
  },
  {
    label: 'Arabic Books Catalogue',
    url: 'https://docs.google.com/spreadsheets/d/12gFZd5azgsYGcdggDIqXawpkiq-_FkLY/edit?usp=sharing&ouid=117954835367113518356&rtpof=true&sd=true',
  },
  {
    label: 'Urdu Books Catalogue',
    url: 'https://docs.google.com/spreadsheets/d/1Gz37omJvELr2pfRGZn69vcbO13fI9vEc/edit?usp=sharing&ouid=117954835367113518356&rtpof=true&sd=true',
  },
]

export function getLanguageName(code: string | null | undefined) {
  switch (code) {
    case 'MAL':
      return 'Malayalam'
    case 'ENG':
      return 'English'
    case 'ARB':
      return 'Arabic'
    case 'URD':
      return 'Urdu'
    default:
      return code || '-'
  }
}

export function getReviewStats(reviews?: BookReview[]) {
  const approvedReviews = (reviews || []).filter((r) => r.approved !== false)
  const count = approvedReviews.length
  const average =
    count > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0

  return {
    count,
    average,
    roundedAverage: Number(average.toFixed(1)),
  }
}