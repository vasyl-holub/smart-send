import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { StartupError } from '@/app/startup-error'
import { initSession } from '@/features/auth'
import './index.css'

async function startMockApi(): Promise<void> {
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
  })
}

const root = createRoot(document.getElementById('root')!)

try {
  await startMockApi()
  void initSession()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error('Failed to start the mock API', error)
  root.render(<StartupError />)
}
