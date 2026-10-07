import { Spinner } from '@/components/ui/spinner'

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Spinner />
      {label}
    </div>
  )
}
