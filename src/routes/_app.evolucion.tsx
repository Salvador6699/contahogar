import { createFileRoute } from '@tanstack/react-router'
import EvolutionPage from '@/pages/EvolutionPage'

export const Route = createFileRoute('/_app/evolucion')({
  component: EvolutionPage,
})
