const STORAGE_KEY = 'smart-sender:fingerprint'
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/

let fingerprint: string | null = null

export function getFingerprint(): string {
  if (fingerprint) return fingerprint

  const stored = readStorage()
  if (stored && FINGERPRINT_PATTERN.test(stored)) {
    fingerprint = stored
  } else {
    fingerprint = generateFingerprint()
    writeStorage(fingerprint)
  }
  return fingerprint
}

function generateFingerprint(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeStorage(value: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value)
  } catch {
    // Storage is unavailable — the fingerprint stays stable for this page lifetime only.
  }
}
