import { getFingerprint } from './fingerprint'
import type { HttpClient } from './http-client'
import { emptyResponseSchema, loginResponseSchema, userSchema } from './schemas'

export interface Credentials {
  email: string
  password: string
}

const CAPTCHA_HEADER = 'X-Captcha-Token'

// The captcha widget is out of scope; the mock accepts any non-empty token.
function getCaptchaToken(): string {
  return 'captcha-placeholder'
}

export function createAuthApi(http: HttpClient, fingerprint: () => string = getFingerprint) {
  return {
    // The device token lives only in this scope: never stored, never in a URL.
    async signIn(credentials: Credentials): Promise<void> {
      const { device_session_token } = await http.post('/auth/login', {
        body: { ...credentials, fingerprint: fingerprint() },
        headers: { [CAPTCHA_HEADER]: getCaptchaToken() },
        schema: loginResponseSchema,
        auth: false,
      })
      await http.post('/auth/token/issue', {
        body: { device_session_token, fingerprint: fingerprint() },
        schema: emptyResponseSchema,
        auth: false,
      })
    },

    rotate: () =>
      http.post('/auth/token/rotate', {
        body: { fingerprint: fingerprint() },
        schema: emptyResponseSchema,
        auth: false,
      }),

    revoke: () =>
      http.post('/auth/token/revoke', {
        body: { fingerprint: fingerprint() },
        schema: emptyResponseSchema,
        auth: false,
      }),

    me: (signal?: AbortSignal) => http.get('/v1/me', { schema: userSchema, signal }),
  }
}

export type AuthApi = ReturnType<typeof createAuthApi>
