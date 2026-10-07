import { AlertCircleIcon, SearchXIcon, WebhookIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { getErrorMessage, WEBHOOKS_PAGE_SIZE } from '@/api'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components'
import { Pagination } from './pagination'
import { useWebhookList } from './queries'
import { SearchInput } from './search-input'
import { useWebhookListParams } from './use-webhook-list-params'
import { WebhooksTable, WebhooksTableSkeleton } from './webhooks-table'

export function WebhooksPage() {
  const { params, setPage, setSearch } = useWebhookListParams()
  const list = useWebhookList(params)

  function renderContent() {
    if (list.isPending) return <WebhooksTableSkeleton rows={WEBHOOKS_PAGE_SIZE} />

    if (list.isError) {
      return (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Couldn't load webhooks</AlertTitle>
          <AlertDescription>{getErrorMessage(list.error)}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )
    }

    const { data, paging } = list.data

    if (data.length === 0) {
      if (paging.results.total > 0) {
        return (
          <EmptyState
            title={`Page ${params.page} doesn't exist`}
            description={`There are only ${paging.pages.last} pages.`}
            action={{ label: 'Go to the last page', onClick: () => setPage(paging.pages.last) }}
          />
        )
      }
      return params.search ? (
        <EmptyState
          icon={<SearchXIcon />}
          title="No matches"
          description={`No webhooks match “${params.search}”.`}
          action={{ label: 'Clear search', onClick: () => setSearch('') }}
        />
      ) : (
        <EmptyState title="No webhooks yet" description="Webhooks you create will show up here." />
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <WebhooksTable webhooks={data} stale={list.isPlaceholderData} />
        <Pagination
          page={paging.pages.current}
          lastPage={paging.pages.last}
          total={paging.results.total}
          disabled={list.isPlaceholderData}
          onChange={setPage}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Webhooks</CardTitle>
        <CardDescription>Endpoints that receive Smart Sender events.</CardDescription>
        <CardAction>
          <SearchInput value={params.search} onChange={setSearch} />
        </CardAction>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
      {/* Edit dialog (child route) */}
      <Outlet />
    </Card>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: { label: string; onClick: () => void }
}

function EmptyState({ title, description, icon = <WebhookIcon />, action }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
