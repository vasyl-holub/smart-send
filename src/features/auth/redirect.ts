import type { Location } from 'react-router'

export const DEFAULT_PRIVATE_PATH = '/webhooks'

interface RedirectState {
  from: string
}

export function redirectState(location: Location): RedirectState {
  return { from: location.pathname + location.search }
}

export function getRedirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    if (state.from.startsWith('/') && !state.from.startsWith('//')) return state.from
  }
  return DEFAULT_PRIVATE_PATH
}
