import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { Webhook, WebhookUpdate } from '@/api'
import {
  Button,
  DialogFooter,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FormAlert,
  Input,
  Spinner,
} from '@/components'
import { applyServerErrors, SERVER_ERROR } from '@/lib/form-errors'
import { useUpdateWebhook } from './queries'

const FIELDS = ['name', 'url'] as const

interface WebhookFormProps {
  webhook: Webhook
  onSaved: () => void
  onCancel: () => void
}

export function WebhookForm({ webhook, onSaved, onCancel }: WebhookFormProps) {
  const updateWebhook = useUpdateWebhook(webhook.id)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WebhookUpdate>({ defaultValues: { name: webhook.name, url: webhook.url } })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await updateWebhook.mutateAsync(values)
      toast.success(`“${saved.name}” saved`)
      onSaved()
    } catch (error) {
      applyServerErrors(error, FIELDS, setError)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.[SERVER_ERROR]?.message} />

        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="webhook-name">Name</FieldLabel>
          <Input
            id="webhook-name"
            aria-invalid={Boolean(errors.name)}
            {...register('name', { required: 'Name is required.' })}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={Boolean(errors.url)}>
          <FieldLabel htmlFor="webhook-url">URL</FieldLabel>
          <Input
            id="webhook-url"
            inputMode="url"
            placeholder="https://"
            className="font-mono text-sm"
            aria-invalid={Boolean(errors.url)}
            {...register('url', { required: 'URL is required.' })}
          />
          <FieldError errors={[errors.url]} />
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
