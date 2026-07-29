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
  checkout_by_name?: string | null
  checkin_by_name?: string | null
  renewal_by_name?: string | null
  members: { name: string; batch: string } | null
  books: Book | null
}

export type RankedItem = {
  name: string
  count: number
  totalPages?: number
}

export type Risala = {
  id: string
  barcode: string
  risala_name: string
  author?: string | null
  language?: string | null
  mushrif?: string | null
  department?: string | null
  year?: string | null
  section_no?: string | null
  status: string
}

export type Reference = {
  id: string
  barcode: string
  reference_name: string
  author?: string | null
  language?: string | null
  price?: number | null
  publication?: string | null
  status: string
}
