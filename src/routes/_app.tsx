import { createFileRoute, Navigate } from '@tanstack/react-router'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/_app')({
  component: ProtectedAppLayout,
})

function ProtectedAppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}
