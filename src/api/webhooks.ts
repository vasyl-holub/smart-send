import type { HttpClient } from './http-client'
import { webhookListSchema, webhookSchema } from './schemas'
import type { Webhook } from './types'

export const WEBHOOKS_PAGE_SIZE = 10

export interface WebhookListParams {
  page: number
  search: string
}

export type WebhookUpdate = Pick<Webhook, 'name' | 'url'>

export function createWebhooksApi(http: HttpClient) {
  return {
    list: ({ page, search }: WebhookListParams, signal?: AbortSignal) =>
      http.get('/v1/webhooks', {
        query: { page, limit: WEBHOOKS_PAGE_SIZE, search: search || undefined },
        schema: webhookListSchema,
        signal,
      }),

    get: (id: number, signal?: AbortSignal) =>
      http.get(`/v1/webhooks/${id}`, { schema: webhookSchema, signal }),

    update: (id: number, data: WebhookUpdate) =>
      http.put(`/v1/webhooks/${id}`, { body: data, schema: webhookSchema }),
  }
}

export type WebhooksApi = ReturnType<typeof createWebhooksApi>
