import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AutoBackupManager } from '@/components/AutoBackupManager'
import NotFound from '@/pages/NotFound'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <TooltipProvider>
      <AutoBackupManager />
      <Outlet />
    </TooltipProvider>
  )
}
