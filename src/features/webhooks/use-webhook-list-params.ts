import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { WebhookListParams } from '@/api'

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function useWebhookListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''

  const params = useMemo<WebhookListParams>(() => ({ page, search }), [page, search])

  const update = useCallback(
    (next: Partial<WebhookListParams>) =>
      setSearchParams((current) => {
        const result = new URLSearchParams(current)
        const merged = { page: parsePage(current.get('page')), search: current.get('search') ?? '', ...next }

        if (merged.page > 1) result.set('page', String(merged.page))
        else result.delete('page')

        if (merged.search) result.set('search', merged.search)
        else result.delete('search')

        return result
      }),
    [setSearchParams],
  )

  const setPage = useCallback((nextPage: number) => update({ page: nextPage }), [update])
  // A new search always starts from the first page.
  const setSearch = useCallback((nextSearch: string) => update({ search: nextSearch, page: 1 }), [update])

  return { params, setPage, setSearch }
}
