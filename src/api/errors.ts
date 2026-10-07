import { apiErrorBodySchema } from './schemas'
import type { ApiErrorType, FieldErrors } from './types'

export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  readonly type: ApiErrorType | 'UnknownError'
  readonly fieldErrors: FieldErrors

  constructor(status: number, type: ApiError['type'], message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.status = status
    this.type = type
    this.fieldErrors = fieldErrors
  }
}

export class SessionExpiredError extends Error {
  override readonly name = 'SessionExpiredError'

  constructor(options?: ErrorOptions) {
    super('Your session has expired. Please sign in again.', options)
  }
}

export class NetworkError extends Error {
  override readonly name = 'NetworkError'

  constructor(options?: ErrorOptions) {
    super('Network error. Check your connection and try again.', options)
  }
}

export class UnexpectedResponseError extends Error {
  override readonly name = 'UnexpectedResponseError'
  readonly endpoint: string

  constructor(endpoint: string, options?: ErrorOptions) {
    super('The server returned an unexpected response. Please try again later.', options)
    this.endpoint = endpoint
  }
}

export function isValidationError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 422
}

export function isNotFoundError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404
}

export function getErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError ||
    error instanceof SessionExpiredError ||
    error instanceof NetworkError ||
    error instanceof UnexpectedResponseError
  ) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = apiErrorBodySchema.safeParse(body)

  if (parsed.success) {
    const { type, message, payload } = parsed.data.error
    return new ApiError(response.status, type, message, payload)
  }
  return new ApiError(response.status, 'UnknownError', `Request failed with status ${response.status}`)
}
