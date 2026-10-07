import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { MOCK_CREDENTIALS, db } from '@/mocks/db'
import { server } from '@/mocks/node'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  // jsdom lacks matchMedia (used by the toaster to follow the system theme).
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  db.reset()
})
afterAll(() => server.close())

async function renderAppAt(url: string) {
  window.history.replaceState(null, '', url)
  // Fresh modules per test, so the app-wide singletons (router, query cache, session) start clean.
  vi.resetModules()
  const { App } = await import('./app')
  const { initSession } = await import('@/features/auth')
  void initSession()
  render(<App />)
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), MOCK_CREDENTIALS.email)
  await user.type(screen.getByLabelText('Password'), MOCK_CREDENTIALS.password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

// The first test pays for a cold import of the whole app under jsdom.
describe('app', { timeout: 20_000 }, () => {
  test('a deep link survives the sign-in redirect and its list params are applied', async () => {
    await renderAppAt('/webhooks?page=2')

    await signIn()

    expect(await screen.findByText('Page 2 of 3')).toBeTruthy()
    expect(window.location.pathname + window.location.search).toBe('/webhooks?page=2')
    const [, firstRow] = screen.getAllByRole('row')
    expect(firstRow?.textContent).toContain('Subscriber joined → Analytics')
  })

  test('server validation errors are shown next to the field they belong to', async () => {
    await renderAppAt('/webhooks/1')
    const user = await signIn()

    const dialog = await screen.findByRole('dialog', { name: 'Edit webhook' })
    const urlInput = await within(dialog).findByLabelText('URL')
    await user.clear(urlInput)
    await user.type(urlInput, 'ftp://nope')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    const error = await within(dialog).findByText('The url must be a valid URL.')
    expect(urlInput.getAttribute('aria-invalid')).toBe('true')
    expect(urlInput.closest('[data-slot="field"]')?.contains(error)).toBe(true)
    expect(within(dialog).getByLabelText('Name').getAttribute('aria-invalid')).toBe('false')
  })
})
