import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  // The URL changed from outside (back/forward, "Clear search") — show it, but don't clobber
  // what's being typed when the URL merely caught up with the draft.
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (draft.trim() !== value) setDraft(value)
  }

  // Debounced so the history doesn't get an entry per keystroke.
  useEffect(() => {
    const normalized = draft.trim()
    if (normalized === value) return
    const timer = setTimeout(() => onChange(normalized), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])

  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        className="pl-8"
        placeholder="Search by name…"
        aria-label="Search webhooks by name"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  )
}
