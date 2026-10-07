import { AlertCircleIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components'

/** Shown when the mock API can't start: without it the app has no backend at all. */
export function StartupError() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Couldn't start the mock API</AlertTitle>
        <AlertDescription>
          The app runs against an in-browser mock (a service worker). Open it in a modern browser via
          http://localhost or HTTPS, and make sure service workers aren't blocked.
        </AlertDescription>
      </Alert>
    </main>
  )
}
