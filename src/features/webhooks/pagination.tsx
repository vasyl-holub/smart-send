import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components'

interface PaginationProps {
  page: number
  lastPage: number
  total: number
  disabled?: boolean
  onChange: (page: number) => void
}

export function Pagination({ page, lastPage, total, disabled = false, onChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      <span className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'webhook' : 'webhooks'}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeftIcon />
          Prev
        </Button>
        <span className="text-sm tabular-nums" aria-current="page">
          Page {page} of {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </nav>
  )
}
