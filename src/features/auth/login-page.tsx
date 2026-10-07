import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import type { Credentials } from '@/api'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FormAlert,
  Input,
  PageLoader,
  Spinner,
} from '@/components'
import { applyServerErrors, SERVER_ERROR } from '@/lib/form-errors'
import { getRedirectTarget } from './redirect'
import { signIn } from './session-actions'
import { useSession } from './session-store'

const FIELDS = ['email', 'password'] as const

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ defaultValues: { email: '', password: '' } })

  if (session.status === 'unknown') return <PageLoader label="Checking session…" />
  if (session.status === 'authenticated') return <Navigate to={getRedirectTarget(location.state)} replace />

  const onSubmit = handleSubmit(async (credentials) => {
    try {
      await signIn(credentials)
    } catch (error) {
      applyServerErrors(error, FIELDS, setError)
    }
  })

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Smart Sender webhooks console</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <FormAlert message={errors.root?.[SERVER_ERROR]?.message} />

              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.email)}
                  {...register('email', { required: 'Email is required.' })}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password', { required: 'Password is required.' })}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
