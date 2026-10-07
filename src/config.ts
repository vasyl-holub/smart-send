export const API_BASE_URL = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

export function apiUrl(path: string): string {
  return new URL(path, API_BASE_URL).href
}
