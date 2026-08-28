import { createFileRoute } from '@tanstack/react-router'
import ComparisonPage from '@/pages/ComparisonPage'

export const Route = createFileRoute('/_app/comparativa')({
  component: ComparisonPage,
})
