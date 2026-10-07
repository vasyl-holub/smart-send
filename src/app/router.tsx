import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage, RequireAuth } from '@/features/auth'
import { EditWebhookDialog, WebhooksPage } from '@/features/webhooks'
import { AppLayout } from './app-layout'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/webhooks" replace /> },
          {
            path: 'webhooks',
            element: <WebhooksPage />,
            children: [{ path: ':webhookId', element: <EditWebhookDialog /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
