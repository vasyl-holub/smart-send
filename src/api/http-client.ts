import type { z } from 'zod'
import { ApiError, NetworkError, SessionExpiredError, UnexpectedResponseError, parseApiError } from './errors'

// Single source of truth: `Method`, the CSRF rule and the get/post/... shortcuts derive from it.
const METHODS = {
  GET: { csrf: false },
  POST: { csrf: true },
  PUT: { csrf: true },
  PATCH: { csrf: true },
  DELETE: { csrf: true },
} as const satisfies Record<string, { csrf: boolean }>

export type Method = keyof typeof METHODS

const CSRF_HEADER = 'X-CSRF-TOKEN'

export type QueryParams = Record<string, string | number | undefined>

export interface RequestOptions<T> {
  method?: Method
  schema: z.ZodType<T>
  query?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** On 401: rotate once, then retry. Auth endpoints pass `false` — so rotate can't trigger rotate. */
  auth?: boolean
}

type TransportOptions = Omit<RequestOptions<unknown>, 'schema'>

type MethodShortcuts = {
  [M in Method as Lowercase<M>]: <T>(path: string, options: Omit<RequestOptions<T>, 'method'>) => Promise<T>
}

export interface HttpClientOptions {
  baseUrl: string
  refreshSession: () => Promise<void>
}

export interface HttpClient extends MethodShortcuts {
  request<T>(path: string, options: RequestOptions<T>): Promise<T>
  onSessionExpired(listener: () => void): () => void
}

export function createHttpClient({ baseUrl, refreshSession }: HttpClientOptions): HttpClient {
  let csrfToken: string | null = null
  let pendingCsrf: Promise<string> | null = null

  let pendingRotate: Promise<void> | null = null
  // Bumped after each rotate: a 401 that arrives after a finished rotate retries without rotating again.
  let sessionGeneration = 0

  const expiredListeners = new Set<() => void>()

  function buildUrl(path: string, query?: QueryParams): URL {
    const url = new URL(path, baseUrl)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
    return url
  }

  async function send(path: string, options: TransportOptions, csrf: string | null): Promise<Response> {
    const method = options.method ?? 'GET'
    const headers = new Headers(options.headers)
    headers.set('X-Requested-With', 'XMLHttpRequest')
    headers.set('Accept', 'application/json')
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    if (csrf && METHODS[method].csrf) headers.set(CSRF_HEADER, csrf)

    try {
      return await fetch(buildUrl(path, options.query), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
        credentials: 'include',
      })
    } catch (error) {
      if (options.signal?.aborted) throw error
      throw new NetworkError({ cause: error })
    }
  }

  function getCsrfToken(): Promise<string> {
    if (csrfToken) return Promise.resolve(csrfToken)

    pendingCsrf ??= (async () => {
      const response = await send('/csrf', {}, null)
      if (!response.ok) throw await parseApiError(response)

      const token = response.headers.get(CSRF_HEADER)
      if (!token) throw new ApiError(response.status, 'UnknownError', 'CSRF token is missing in the response')
      csrfToken = token
      return token
    })().finally(() => {
      pendingCsrf = null
    })

    return pendingCsrf
  }

  function rotateSession(): Promise<void> {
    pendingRotate ??= refreshSession()
      .then(
        () => {
          sessionGeneration += 1
        },
        (error: unknown) => {
          // A network failure says nothing about the session — keep it and let the caller retry later.
          if (error instanceof NetworkError) throw error
          // Notified once per failed rotate, not once per waiting request.
          notifySessionExpired()
          throw new SessionExpiredError({ cause: error })
        },
      )
      .finally(() => {
        pendingRotate = null
      })

    return pendingRotate
  }

  function notifySessionExpired(): void {
    for (const listener of expiredListeners) listener()
  }

  async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
    const { auth = true } = options
    let csrfRetried = false
    let sessionRetried = false

    for (;;) {
      const csrf = await getCsrfToken()
      const generation = sessionGeneration
      const response = await send(path, options, csrf)

      if (response.status === 419 && !csrfRetried) {
        csrfRetried = true
        // Another request may already have fetched a fresh token — don't drop it.
        if (csrfToken === csrf) csrfToken = null
        continue
      }

      if (response.status === 401 && auth) {
        if (sessionRetried) {
          notifySessionExpired()
          throw new SessionExpiredError()
        }
        sessionRetried = true
        if (generation === sessionGeneration) await rotateSession()
        continue
      }

      if (!response.ok) throw await parseApiError(response)
      return parseBody(response, options.schema, `${options.method ?? 'GET'} ${path}`)
    }
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, options) => request(path, { ...options, method: 'POST' }),
    put: (path, options) => request(path, { ...options, method: 'PUT' }),
    patch: (path, options) => request(path, { ...options, method: 'PATCH' }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
    onSessionExpired(listener) {
      expiredListeners.add(listener)
      return () => expiredListeners.delete(listener)
    },
  }
}

async function parseBody<T>(response: Response, schema: z.ZodType<T>, endpoint: string): Promise<T> {
  const text = await response.text()

  let body: unknown
  try {
    body = text ? JSON.parse(text) : undefined
  } catch (error) {
    throw new UnexpectedResponseError(endpoint, { cause: error })
  }

  const result = schema.safeParse(body)
  if (!result.success) throw new UnexpectedResponseError(endpoint, { cause: result.error })
  return result.data
}
