export type Book = {
  title: string
  barcode: string
  author?: string
  pages?: number | null
  price?: number | null
  edition?: string | null
  publication?: string | null
}

export type Member = {
  id: string
  name: string
  barcode: string
  batch: string
  category: string
  ph_no?: string | null
  address?: string | null
  dob?: string | null
  email?: string | null
  class?: string | null
  image_link?: string | null
}

export type HistoryRecord = {
  id: number
  borrow_date: string
  due_date: string
  return_date: string | null
  fine: number
  fine_paid: boolean
  member_id: string
  members: { name: string; batch: string } | null
  books: Book | null
}

export type RankedItem = {
  name: string
  count: number
  totalPages?: number
}
