import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { routeTree } from './routeTree.gen'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let isRefreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || isRefreshing) return
    isRefreshing = true
    window.location.reload()
  })

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      registration.update().catch(() => {})

      const checkForUpdate = () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      }

      document.addEventListener('visibilitychange', checkForUpdate)
      window.addEventListener('focus', checkForUpdate)
      window.addEventListener('online', checkForUpdate)
      setInterval(() => {
        registration.update().catch(() => {})
      }, 5 * 60 * 1000)
    },
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
})

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)

