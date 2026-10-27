import { BsPagination } from "@brandsync/react"

/** Brandsync `bs-pagination` (0-indexed `page`). */
function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  return (
    <BsPagination
      totalPages={pageCount}
      currentPage={page + 1}
      onBsPageChange={(event) => onPageChange(event.detail - 1)}
    />
  )
}

export { Pagination }
