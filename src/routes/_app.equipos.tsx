import { createFileRoute } from '@tanstack/react-router'
import TeamsPage from '@/pages/TeamsPage'

export const Route = createFileRoute('/_app/equipos')({
  component: TeamsPage,
})
