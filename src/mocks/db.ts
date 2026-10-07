import type { User, Webhook } from '../api/types'

export const MOCK_CREDENTIALS = { email: 'admin@smartsender.io', password: 'password123' } as const

export const MOCK_USER: User = {
  id: 1,
  email: MOCK_CREDENTIALS.email,
  first_name: 'Vasyl',
  last_name: 'Holub',
  name: 'Vasyl Holub',
}

export const CSRF_TOKEN = 'f3b1c7e2a9d84e6b9c1f0a2d5e7b8c4a'
export const SESSION_TTL_MS = 30_000

const WEBHOOK_TOPICS = [
  'Order created',
  'Order paid',
  'Order refunded',
  'Subscriber joined',
  'Subscriber left',
  'Message delivered',
  'Message failed',
  'Campaign finished',
  'Invoice issued',
] as const

const WEBHOOK_TARGETS = ['CRM', 'Analytics', 'Slack'] as const

function seedWebhooks(): Webhook[] {
  const createdFrom = Date.UTC(2025, 0, 1)
  const day = 24 * 60 * 60 * 1000

  return WEBHOOK_TOPICS.flatMap((topic, topicIndex) =>
    WEBHOOK_TARGETS.map((target, targetIndex) => {
      const id = topicIndex * WEBHOOK_TARGETS.length + targetIndex + 1
      return {
        id,
        name: `${topic} → ${target}`,
        url: `https://hooks.example.com/${target.toLowerCase()}/${topic.toLowerCase().replaceAll(' ', '-')}`,
        active: id % 4 !== 0,
        created_at: new Date(createdFrom + id * day).toISOString(),
      }
    }),
  )
}

interface ServerSession {
  fingerprint: string
  expiresAt: number
}

interface State {
  webhooks: Webhook[]
  deviceTokens: Map<string, string>
  session: ServerSession | null
}

function createState(): State {
  return { webhooks: seedWebhooks(), deviceTokens: new Map(), session: null }
}

let state = createState()

export const db = {
  reset(): void {
    state = createState()
  },

  webhooks: {
    all: (): readonly Webhook[] => state.webhooks,
    find: (id: number): Webhook | undefined => state.webhooks.find((webhook) => webhook.id === id),
    update(id: number, patch: Pick<Webhook, 'name' | 'url'>): Webhook | undefined {
      const index = state.webhooks.findIndex((webhook) => webhook.id === id)
      const current = state.webhooks[index]
      if (!current) return undefined
      const updated = { ...current, ...patch }
      state.webhooks = state.webhooks.with(index, updated)
      return updated
    },
  },

  sessions: {
    createDeviceToken(fingerprint: string): string {
      const token = crypto.randomUUID()
      state.deviceTokens.set(token, fingerprint)
      return token
    },

    issue(deviceToken: string, fingerprint: string): boolean {
      if (state.deviceTokens.get(deviceToken) !== fingerprint) return false
      state.deviceTokens.delete(deviceToken)
      state.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
      return true
    },

    rotate(fingerprint: string): boolean {
      if (!state.session || state.session.fingerprint !== fingerprint) return false
      state.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
      return true
    },

    revoke(): void {
      state.session = null
    },

    isActive(): boolean {
      return state.session !== null && Date.now() < state.session.expiresAt
    },
  },
}
