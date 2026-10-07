import { authApi, httpClient, type Credentials } from '@/api'
import { queryClient } from '@/lib/query-client'
import { sessionStore } from './session-store'

function endLocalSession(): void {
  queryClient.clear()
  sessionStore.clear()
}

let initialized = false

// Called explicitly from main.tsx (and the UI test) instead of subscribing as an import side effect.
export function initSession(): Promise<void> {
  if (!initialized) {
    initialized = true
    httpClient.onSessionExpired(endLocalSession)
  }
  return restoreSession()
}

let pendingRestore: Promise<void> | null = null

// A real backend keeps the session in a cookie across reloads; the in-memory mock forgets it,
// so there this ends on the login screen (allowed by the task).
function restoreSession(): Promise<void> {
  pendingRestore ??= authApi.me().then(sessionStore.authenticate, sessionStore.clear)
  return pendingRestore
}

export async function signIn(credentials: Credentials): Promise<void> {
  await authApi.signIn(credentials)
  sessionStore.authenticate(await authApi.me())
}

export async function signOut(): Promise<void> {
  try {
    await authApi.revoke()
  } catch {
    // Best effort: even if revoke fails, the user asked to leave — never keep them half signed in.
  }
  endLocalSession()
}
