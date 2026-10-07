import { LogOutIcon, WebhookIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components'
import { signOut, useCurrentUser } from '@/features/auth'

export function AppLayout() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    await signOut()
    void navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/webhooks" className="flex items-center gap-2 font-semibold">
            <WebhookIcon className="size-5" />
            Smart Sender
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline" title={user.email}>
              {user.name}
            </span>
            <Button variant="outline" size="sm" disabled={isSigningOut} onClick={() => void handleSignOut()}>
              <LogOutIcon />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
