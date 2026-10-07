import { useSyncExternalStore } from 'react'
import type { User } from '@/api'

export type SessionState =
  { status: 'unknown' } | { status: 'anonymous' } | { status: 'authenticated'; user: User }

let state: SessionState = { status: 'unknown' }
const listeners = new Set<() => void>()

function setState(next: SessionState): void {
  state = next
  for (const listener of listeners) listener()
}

export const sessionStore = {
  getState: (): SessionState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  authenticate: (user: User) => setState({ status: 'authenticated', user }),
  clear: () => setState({ status: 'anonymous' }),
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState)
}

export function useCurrentUser(): User {
  const session = useSession()
  if (session.status !== 'authenticated')
    throw new Error('useCurrentUser() used outside of an authenticated route')
  return session.user
}
