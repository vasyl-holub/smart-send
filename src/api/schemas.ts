import { z } from 'zod'

export const userSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
})

export const webhookSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string(),
  active: z.boolean(),
  created_at: z.string(),
})

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    paging: z.object({
      pages: z.object({ current: z.number().int(), last: z.number().int() }),
      results: z.object({ total: z.number().int(), limitation: z.number().int() }),
    }),
  })
}

export const webhookListSchema = paginatedSchema(webhookSchema)

export const loginResponseSchema = z.object({
  device_session_token: z.string().min(1),
})

export const emptyResponseSchema = z.unknown().transform((): void => undefined)

export const apiErrorTypeSchema = z.enum([
  'BadRequestException',
  'AuthenticationException',
  'NotFoundException',
  'TokenMismatchException',
  'ValidationException',
])

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()))

export const apiErrorBodySchema = z.object({
  error: z.object({
    type: apiErrorTypeSchema,
    message: z.string(),
    payload: fieldErrorsSchema.optional(),
  }),
})
