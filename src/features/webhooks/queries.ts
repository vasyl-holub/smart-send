import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { webhooksApi, type WebhookListParams, type WebhookUpdate } from '@/api'

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: WebhookListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

export function useWebhookList(params: WebhookListParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => webhooksApi.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => webhooksApi.get(id, signal),
  })
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: WebhookUpdate) => webhooksApi.update(id, data),
    onSuccess: (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook)
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
