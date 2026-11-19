import { createFileRoute } from '@tanstack/react-router'
import QuickExpensePage from '@/pages/QuickExpensePage'

export const Route = createFileRoute('/gasto')({
  component: QuickExpensePage,
})
