import { PencilIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import type { Webhook } from '@/api'
import {
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components'
import { cn } from '@/lib/utils'
import { EDIT_LINK_STATE } from './edit-link'

function WebhooksTableShell({ children, stale = false }: { children: ReactNode; stale?: boolean }) {
  return (
    <Table className={cn('table-fixed transition-opacity', stale && 'opacity-50')} aria-busy={stale}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[35%]">Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-14">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

export function WebhooksTable({ webhooks, stale }: { webhooks: Webhook[]; stale: boolean }) {
  const location = useLocation()

  return (
    <WebhooksTableShell stale={stale}>
      {webhooks.map((webhook) => (
        <TableRow key={webhook.id}>
          <TableCell className="truncate font-medium">{webhook.name}</TableCell>
          <TableCell className="truncate font-mono text-xs text-muted-foreground" title={webhook.url}>
            {webhook.url}
          </TableCell>
          <TableCell>
            <Badge variant={webhook.active ? 'secondary' : 'outline'}>
              {webhook.active ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link
                to={{ pathname: String(webhook.id), search: location.search }}
                state={EDIT_LINK_STATE}
                aria-label={`Edit ${webhook.name}`}
              >
                <PencilIcon />
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </WebhooksTableShell>
  )
}

export function WebhooksTableSkeleton({ rows }: { rows: number }) {
  return (
    <WebhooksTableShell>
      {Array.from({ length: rows }, (_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-3/4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </WebhooksTableShell>
  )
}
