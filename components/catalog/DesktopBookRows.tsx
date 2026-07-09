'use client'

import { Star } from 'lucide-react'
import clsx from 'classnames'
import StatusBadge from './StatusBadge'
import type { Book, BookReview } from '@/app/catalog/catalog-utils'

export default function DesktopBookRows({
  book,
  onOpenReview,
  getLanguageName,
  getReviewStats,
}: {
  book: Book
  onOpenReview: () => void
  getLanguageName: (code: string | null | undefined) => string
  getReviewStats: (reviews?: BookReview[]) => {
    count: number
    average: number
    roundedAverage: number
  }
}) {
  const activeBorrow = book.borrow_records?.find((br) => br.return_date === null)
  const borrowedBy = activeBorrow?.members?.name
  const activeHold = book.hold_records?.find((hr) => !hr.released)
  const heldBy = activeHold?.member?.name
  const stats = getReviewStats(book.book_reviews)

  return (
    <>
      <tr className="border-b border-primary-dark-grey transition hover:bg-primary-grey/70">
        <td className="px-4 py-4 align-top text-text-grey">{book.barcode}</td>
        <td className="px-4 py-4 align-top">
          <div className="font-malayalam font-semibold text-heading-text-black">
            {book.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-grey">
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="fill-current" />
              {stats.count > 0 ? `${stats.roundedAverage}/5` : 'No ratings yet'}
            </span>
            <span>•</span>
            <span>{stats.count} review{stats.count === 1 ? '' : 's'}</span>
          </div>
        </td>
        <td className="px-4 py-4 align-top font-malayalam text-text-grey">
          {book.author || '-'}
        </td>
        <td className="px-4 py-4 align-top text-text-grey">
          {getLanguageName(book.language)}
        </td>
        <td className="px-4 py-4 align-top font-semibold text-text-grey">
          {book.pages ?? '-'}
        </td>
        <td className="px-4 py-4 align-top text-text-grey">
          {book.call_number || '-'}
        </td>
        <td className="px-4 py-4 align-top text-text-grey">
          {book.edition || '-'}
        </td>
        <td className="px-4 py-4 align-top text-text-grey">
          {book.publication || '-'}
        </td>
        <td className="px-4 py-4 align-top font-semibold text-text-grey">
          {book.price != null ? `₹${book.price}` : '-'}
        </td>
        <td className="px-4 py-4 align-top">
          <StatusBadge status={book.status} heldBy={heldBy} borrowedBy={borrowedBy} />
        </td>
      </tr>

      <tr className="border-b border-primary-dark-grey bg-[#fafafa]">
        <td colSpan={10} className="px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-text-grey">
                <span className="inline-flex items-center gap-1 font-semibold text-yellow-700">
                  <Star size={14} className="fill-current" />
                  {stats.count > 0 ? `${stats.roundedAverage} / 5` : 'No rating'}
                </span>
                <span>
                  based on {stats.count} review{stats.count === 1 ? '' : 's'}
                </span>
              </div>

              <button
                onClick={onOpenReview}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-button-yellow px-4 py-2 text-sm font-semibold text-button-text-black transition hover:bg-yellow-500"
              >
                Write a Review
              </button>
            </div>

            {book.book_reviews &&
              book.book_reviews.filter((r) => r.approved !== false).length > 0 && (
                <div className="grid gap-2">
                  {book.book_reviews
                    .filter((r) => r.approved !== false)
                    .slice(0, 2)
                    .map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-primary-dark-grey bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-heading-text-black">
                              {review.reviewer_name}
                              {review.reviewer_role ? ` • ${review.reviewer_role}` : ''}
                            </div>
                            {review.comment && (
                              <p className="mt-1 text-sm text-text-grey">
                                {review.comment}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-yellow-700 font-semibold">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={clsx(
                                  i < review.rating
                                    ? 'fill-current text-yellow-500'
                                    : 'text-gray-300'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>
        </td>
      </tr>
    </>
  )
}
