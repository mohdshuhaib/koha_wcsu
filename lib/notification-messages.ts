import dayjs from 'dayjs'

export function formatLibraryDate(value: string | Date) {
  return dayjs(value).format('DD MMM YYYY')
}

export function checkoutMessage({
  bookTitle,
  authorName,
  checkoutDate,
  dueDate,
}: {
  bookTitle: string
  authorName?: string | null
  checkoutDate: string | Date
  dueDate: string | Date
}) {
  return `You have borrowed "${bookTitle}"${authorName ? ` by ${authorName}` : ''} on ${formatLibraryDate(checkoutDate)}. Please return it on or before ${formatLibraryDate(dueDate)}. Thank you.`
}

export function checkinMessage({
  bookTitle,
  authorName,
  checkinDate,
}: {
  bookTitle: string
  authorName?: string | null
  checkinDate: string | Date
}) {
  return `You have returned "${bookTitle}"${authorName ? ` by ${authorName}` : ''} on ${formatLibraryDate(checkinDate)}. Thank you.`
}

export function finePaymentMessage({
  paidAmount,
  totalFine,
}: {
  paidAmount: number
  totalFine: number
}) {
  return `Your fine payment of Rs. ${paidAmount} has been recorded out of a total fine of Rs. ${totalFine}. Thank you.`
}

export function dueTomorrowMessage({
  bookTitle,
  authorName,
}: {
  bookTitle: string
  authorName?: string | null
}) {
  return `Your book "${bookTitle}"${authorName ? ` by ${authorName}` : ''} is due tomorrow. Please return it on time to avoid a fine. Thank you.`
}
