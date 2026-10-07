import { API_BASE_URL } from '../config'
import { createAuthApi } from './auth'
import { createHttpClient } from './http-client'
import { createWebhooksApi } from './webhooks'

export const httpClient = createHttpClient({
  baseUrl: API_BASE_URL,
  refreshSession: () => authApi.rotate(),
})

export const authApi = createAuthApi(httpClient)
export const webhooksApi = createWebhooksApi(httpClient)

export * from './errors'
export type * from './types'
export type { Credentials } from './auth'
export type { WebhookListParams, WebhookUpdate } from './webhooks'
export { WEBHOOKS_PAGE_SIZE } from './webhooks'
