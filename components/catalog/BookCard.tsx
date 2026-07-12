'use client'

import { Star } from 'lucide-react'
import clsx from 'classnames'
import InfoItem from './InfoItem'
import StatusBadge from './StatusBadge'
import type { Book, BookReview } from '@/app/catalog/catalog-utils'

export default function BookCard({
  book,
  onOpenReview,
  onOpenAllReviews,
  getLanguageName,
  getReviewStats,
}: {
  book: Book
  onOpenReview: () => void
  onOpenAllReviews: () => void
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
  const approvedReviews = book.book_reviews?.filter((r) => r.approved !== false) || []
  const latestReview = approvedReviews[0]
  const extraReviewCount = Math.max(approvedReviews.length - 1, 0)

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-primary-dark-grey bg-white shadow-sm transition hover:shadow-md">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-grey">
              Barcode: {book.barcode}
            </p>
            <h2 className="mt-1 break-words font-malayalam text-lg font-bold leading-snug text-heading-text-black">
              {book.title}
            </h2>
            <p className="mt-1 text-sm text-text-grey">{book.author || '-'}</p>
          </div>

          <StatusBadge status={book.status} heldBy={heldBy} borrowedBy={borrowedBy} />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-primary-grey p-3">
          <InfoItem label="Language" value={getLanguageName(book.language)} />
          <InfoItem label="Pages" value={book.pages ? String(book.pages) : '-'} />
          <InfoItem label="Call No." value={book.call_number || '-'} />
          <InfoItem label="Edition" value={book.edition || '-'} />
          <InfoItem label="Publication" value={book.publication || '-'} />
          <InfoItem label="Price" value={book.price != null ? `₹${book.price}` : '-'} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-text-grey">
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 font-semibold text-yellow-700">
            <Star size={14} className="fill-current" />
            {stats.count > 0 ? `${stats.roundedAverage}/5` : 'No ratings'}
          </span>
          <button
            type="button"
            onClick={onOpenAllReviews}
            disabled={stats.count === 0}
            className="font-semibold text-dark-green transition hover:underline disabled:cursor-default disabled:text-text-grey disabled:no-underline"
          >
            {stats.count} review{stats.count === 1 ? '' : 's'}
          </button>
        </div>

        {latestReview && (
          <div className="rounded-2xl border border-primary-dark-grey bg-primary-grey/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading-text-black">
                  Latest review by {latestReview.reviewer_name}
                </p>
                {latestReview.comment && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-grey">
                    {latestReview.comment}
                  </p>
                )}
                {extraReviewCount > 0 && (
                  <button
                    type="button"
                    onClick={onOpenAllReviews}
                    className="mt-1 text-left text-xs font-semibold text-dark-green hover:underline"
                  >
                    +{extraReviewCount} more review{extraReviewCount === 1 ? '' : 's'}
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1 text-yellow-700">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={clsx(
                      i < latestReview.rating
                        ? 'fill-current text-yellow-500'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onOpenReview}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-button-yellow px-4 py-3 text-sm font-semibold text-button-text-black transition hover:bg-yellow-500"
        >
          Write a Review
        </button>
      </div>
    </article>
  )
}
