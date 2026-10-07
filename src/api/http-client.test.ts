import { http as mock, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { API_BASE_URL, apiUrl } from '../config'
import { MOCK_CREDENTIALS, SESSION_TTL_MS, db } from '../mocks/db'
import { server } from '../mocks/node'
import { createAuthApi } from './auth'
import { NetworkError, SessionExpiredError, UnexpectedResponseError } from './errors'
import { createHttpClient } from './http-client'
import { createWebhooksApi } from './webhooks'

const FINGERPRINT = '0123456789abcdef0123456789abcdef'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  db.reset()
  vi.useRealTimers()
})
afterAll(() => server.close())

function setup() {
  const httpClient = createHttpClient({ baseUrl: API_BASE_URL, refreshSession: () => auth.rotate() })
  const auth = createAuthApi(httpClient, () => FINGERPRINT)
  const webhooks = createWebhooksApi(httpClient)

  const onSessionExpired = vi.fn()
  httpClient.onSessionExpired(onSessionExpired)

  return { auth, webhooks, onSessionExpired }
}

/** Records every mocked response as `METHOD /path → status`, in completion order. */
function recordTraffic() {
  const log: string[] = []
  server.events.on('response:mocked', ({ request, response }) => {
    log.push(`${request.method} ${new URL(request.url).pathname} → ${response.status}`)
  })
  return log
}

/** Moves the clock past the session TTL. Only `Date` is faked, so MSW timers keep running. */
function expireSession() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1_000)
}

describe('session rotation', () => {
  test('two parallel requests that get 401 share one rotate and both succeed on retry', async () => {
    const { auth, webhooks, onSessionExpired } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    expireSession()
    const traffic = recordTraffic()

    const [me, list] = await Promise.all([auth.me(), webhooks.list({ page: 1, search: '' })])

    expect(me.email).toBe(MOCK_CREDENTIALS.email)
    expect(list.data).toHaveLength(10)

    expect(traffic.filter((entry) => entry.includes('/auth/token/rotate'))).toEqual([
      'POST /auth/token/rotate → 200',
    ])
    expect(traffic.filter((entry) => entry.includes('/v1/me'))).toEqual([
      'GET /v1/me → 401',
      'GET /v1/me → 200',
    ])
    expect(traffic.filter((entry) => entry.includes('/v1/webhooks'))).toEqual([
      'GET /v1/webhooks → 401',
      'GET /v1/webhooks → 200',
    ])
    // Both 401s happened before the rotate, both retries after it.
    expect(traffic.slice(0, 2).every((entry) => entry.endsWith('401'))).toBe(true)
    expect(traffic[2]).toBe('POST /auth/token/rotate → 200')
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  test('a 401 that arrives after the rotate has finished retries without rotating again', async () => {
    const { auth, webhooks, onSessionExpired } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    expireSession()
    const traffic = recordTraffic()

    // Hold the list request's 401 until the rotate triggered by `/v1/me` has finished:
    // the client must notice the newer session generation and retry without rotating again.
    let rotated!: () => void
    const rotateDone = new Promise<void>((resolve) => (rotated = resolve))
    server.events.on('response:mocked', ({ request }) => {
      if (new URL(request.url).pathname === '/auth/token/rotate') rotated()
    })
    server.use(
      mock.get(
        apiUrl('/v1/webhooks'),
        async () => {
          await rotateDone
          await new Promise((resolve) => setTimeout(resolve, 20))
          return HttpResponse.json(null, { status: 401 })
        },
        { once: true },
      ),
    )

    const [me, list] = await Promise.all([auth.me(), webhooks.list({ page: 1, search: '' })])

    expect(me.email).toBe(MOCK_CREDENTIALS.email)
    expect(list.data).toHaveLength(10)
    expect(traffic.filter((entry) => entry.includes('/auth/token/rotate'))).toEqual([
      'POST /auth/token/rotate → 200',
    ])
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  test('a network failure during rotate keeps the session and surfaces as a network error', async () => {
    const { auth, onSessionExpired } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    expireSession()
    // `HttpResponse.error()` simulates a network failure (fetch rejects), only for the first rotate.
    server.use(mock.post(apiUrl('/auth/token/rotate'), () => HttpResponse.error(), { once: true }))

    await expect(auth.me()).rejects.toBeInstanceOf(NetworkError)
    expect(onSessionExpired).not.toHaveBeenCalled()

    // The session survived: the next attempt rotates successfully.
    await expect(auth.me()).resolves.toMatchObject({ email: MOCK_CREDENTIALS.email })
  })

  test('failed rotate ends the session for every waiting request', async () => {
    const { auth, webhooks, onSessionExpired } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    db.sessions.revoke() // from now on the mock answers 401 and rotate answers 400
    const traffic = recordTraffic()

    const results = await Promise.allSettled([auth.me(), webhooks.list({ page: 1, search: '' })])

    for (const result of results) {
      expect(result.status).toBe('rejected')
      expect(result.status === 'rejected' && result.reason).toBeInstanceOf(SessionExpiredError)
    }
    expect(traffic.filter((entry) => entry.includes('/auth/token/rotate'))).toEqual([
      'POST /auth/token/rotate → 400',
    ])
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })
})

describe('csrf', () => {
  test('on 419 the token is re-fetched and the request is retried once', async () => {
    const { auth, webhooks } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    // The first PUT gets 419 as if the token had expired; the retry reaches the real handler.
    server.use(
      mock.put(apiUrl('/v1/webhooks/:id'), () => HttpResponse.json(null, { status: 419 }), { once: true }),
    )
    const traffic = recordTraffic()

    const updated = await webhooks.update(1, { name: 'Renamed', url: 'https://example.com/hook' })

    expect(updated.name).toBe('Renamed')
    expect(traffic).toEqual(['PUT /v1/webhooks/1 → 419', 'GET /csrf → 204', 'PUT /v1/webhooks/1 → 200'])
  })
})

describe('response validation', () => {
  test('a body that breaks the contract is rejected at the API boundary', async () => {
    const { auth, webhooks } = setup()
    await auth.signIn(MOCK_CREDENTIALS)
    // `id` is a string and `url`/`active`/`created_at` are missing.
    server.use(mock.get(apiUrl('/v1/webhooks/:id'), () => HttpResponse.json({ id: '1', name: 'No url' })))

    await expect(webhooks.get(1)).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})
