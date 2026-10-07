import { delay, http, HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorType, FieldErrors, WebhookList } from '../api/types'
import { apiUrl } from '../config'
import { CSRF_TOKEN, MOCK_CREDENTIALS, MOCK_USER, db } from './db'

const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

function errorResponse(status: number, type: ApiErrorType, message: string, payload?: FieldErrors) {
  const body: ApiErrorBody = { error: { type, message, ...(payload && { payload }) } }
  return HttpResponse.json(body, { status })
}

const badRequest = () => errorResponse(400, 'BadRequestException', 'Bad request.')
const unauthenticated = () => errorResponse(401, 'AuthenticationException', 'Unauthenticated.')
const notFound = () => errorResponse(404, 'NotFoundException', 'Resource not found.')
const tokenMismatch = () => errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.')
const validationFailed = (payload: FieldErrors) =>
  errorResponse(422, 'ValidationException', 'The given data was invalid.', payload)

function verifyCsrf(request: Request) {
  return request.headers.get('X-CSRF-TOKEN') === CSRF_TOKEN ? null : tokenMismatch()
}

function verifySession() {
  return db.sessions.isActive() ? null : unauthenticated()
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function validateFingerprint(fingerprint: string): FieldErrors {
  return FINGERPRINT_PATTERN.test(fingerprint) ? {} : { fingerprint: ['The fingerprint is invalid.'] }
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value)
    return (protocol === 'http:' || protocol === 'https:') && hostname.length > 0
  } catch {
    return false
  }
}

function validateWebhook(name: string, url: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = ['The name field is required.']
  else if (name.length > 255) errors.name = ['The name may not be greater than 255 characters.']

  if (!url.trim()) errors.url = ['The url field is required.']
  else if (!isHttpUrl(url.trim())) errors.url = ['The url must be a valid URL.']
  return errors
}

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0

export const handlers = [
  http.get(apiUrl('/csrf'), async () => {
    await delay()
    return new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': CSRF_TOKEN } })
  }),

  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await delay()
    const csrfError = verifyCsrf(request)
    if (csrfError) return csrfError

    const body = await readBody(request)
    const email = asString(body.email).trim()
    const password = asString(body.password)
    const fingerprint = asString(body.fingerprint)

    const errors: FieldErrors = { ...validateFingerprint(fingerprint) }
    if (!request.headers.get('X-Captcha-Token')) errors.captcha = ['The captcha token is required.']
    if (!email) errors.email = ['The email field is required.']
    if (!password) errors.password = ['The password field is required.']
    if (hasErrors(errors)) return validationFailed(errors)

    if (email.toLowerCase() !== MOCK_CREDENTIALS.email || password !== MOCK_CREDENTIALS.password) {
      return validationFailed({ password: ['These credentials do not match our records.'] })
    }

    return HttpResponse.json({ device_session_token: db.sessions.createDeviceToken(fingerprint) })
  }),

  http.post(apiUrl('/auth/token/issue'), async ({ request }) => {
    await delay()
    const csrfError = verifyCsrf(request)
    if (csrfError) return csrfError

    const body = await readBody(request)
    const deviceToken = asString(body.device_session_token)
    const fingerprint = asString(body.fingerprint)

    if (!db.sessions.issue(deviceToken, fingerprint)) {
      return validationFailed({ device_session_token: ['The device session token is invalid.'] })
    }
    return new HttpResponse(null, { status: 200 })
  }),

  http.post(apiUrl('/auth/token/rotate'), async ({ request }) => {
    await delay()
    const csrfError = verifyCsrf(request)
    if (csrfError) return csrfError

    const { fingerprint } = await readBody(request)
    return db.sessions.rotate(asString(fingerprint)) ? new HttpResponse(null, { status: 200 }) : badRequest()
  }),

  http.post(apiUrl('/auth/token/revoke'), async ({ request }) => {
    await delay()
    const csrfError = verifyCsrf(request)
    if (csrfError) return csrfError

    db.sessions.revoke()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(apiUrl('/v1/me'), async () => {
    await delay()
    return verifySession() ?? HttpResponse.json(MOCK_USER)
  }),

  http.get(apiUrl('/v1/webhooks'), async ({ request }) => {
    await delay()
    const sessionError = verifySession()
    if (sessionError) return sessionError

    const params = new URL(request.url).searchParams
    const page = parsePositiveInt(params.get('page'), 1)
    const limit = Math.min(parsePositiveInt(params.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)
    const search = (params.get('search') ?? '').trim().toLowerCase()

    const matching = search
      ? db.webhooks.all().filter((webhook) => webhook.name.toLowerCase().includes(search))
      : db.webhooks.all()

    const body: WebhookList = {
      data: matching.slice((page - 1) * limit, page * limit),
      paging: {
        pages: { current: page, last: Math.max(1, Math.ceil(matching.length / limit)) },
        results: { total: matching.length, limitation: limit },
      },
    }
    return HttpResponse.json(body)
  }),

  http.get(apiUrl('/v1/webhooks/:id'), async ({ params }) => {
    await delay()
    const sessionError = verifySession()
    if (sessionError) return sessionError

    const webhook = db.webhooks.find(Number(params.id))
    return webhook ? HttpResponse.json(webhook) : notFound()
  }),

  http.put(apiUrl('/v1/webhooks/:id'), async ({ request, params }) => {
    await delay()
    // CSRF is checked before anything else, as the CSRF middleware would.
    const guardError = verifyCsrf(request) ?? verifySession()
    if (guardError) return guardError

    const id = Number(params.id)
    if (!db.webhooks.find(id)) return notFound()

    const body = await readBody(request)
    const name = asString(body.name)
    const url = asString(body.url)

    const errors = validateWebhook(name, url)
    if (hasErrors(errors)) return validationFailed(errors)

    return HttpResponse.json(db.webhooks.update(id, { name: name.trim(), url: url.trim() }))
  }),
]
