import type { z } from 'zod'
import type {
  apiErrorBodySchema,
  apiErrorTypeSchema,
  fieldErrorsSchema,
  userSchema,
  webhookListSchema,
  webhookSchema,
} from './schemas'

export type User = z.infer<typeof userSchema>
export type Webhook = z.infer<typeof webhookSchema>
export type WebhookList = z.infer<typeof webhookListSchema>

export type ApiErrorType = z.infer<typeof apiErrorTypeSchema>
export type FieldErrors = z.infer<typeof fieldErrorsSchema>
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
