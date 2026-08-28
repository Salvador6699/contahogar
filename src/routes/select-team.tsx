import { createFileRoute, Navigate } from '@tanstack/react-router'
import TeamSelectPage from '@/pages/auth/TeamSelectPage'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/select-team')({
  component: SelectTeamWrapper,
})

function SelectTeamWrapper() {
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

  return <TeamSelectPage />
}
