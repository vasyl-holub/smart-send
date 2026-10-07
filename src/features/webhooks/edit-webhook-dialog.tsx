import { AlertCircleIcon } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getErrorMessage, isNotFoundError } from '@/api'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  PageLoader,
} from '@/components'
import { isOpenedFromList } from './edit-link'
import { useWebhook } from './queries'
import { WebhookForm } from './webhook-form'

function parseId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function EditWebhookDialog() {
  const { webhookId } = useParams()
  const id = parseId(webhookId)
  const navigate = useNavigate()
  const location = useLocation()

  const close = useCallback(() => {
    // Opened from the list → going back restores it exactly; opened via a direct link → replace.
    if (isOpenedFromList(location.state)) void navigate(-1)
    else void navigate({ pathname: '/webhooks', search: location.search }, { replace: true })
  }, [navigate, location.state, location.search])

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit webhook</DialogTitle>
          <DialogDescription>Changes take effect for the next delivered event.</DialogDescription>
        </DialogHeader>
        {id === null ? <NotFound /> : <WebhookEditor id={id} onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function WebhookEditor({ id, onDone }: { id: number; onDone: () => void }) {
  const webhook = useWebhook(id)

  if (webhook.isPending) return <PageLoader />
  if (webhook.isError) {
    if (isNotFoundError(webhook.error)) return <NotFound />
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Couldn't load the webhook</AlertTitle>
        <AlertDescription>{getErrorMessage(webhook.error)}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => void webhook.refetch()}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return <WebhookForm key={webhook.data.id} webhook={webhook.data} onSaved={onDone} onCancel={onDone} />
}

function NotFound() {
  return (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Webhook not found</AlertTitle>
      <AlertDescription>It doesn't exist or has been removed.</AlertDescription>
    </Alert>
  )
}
