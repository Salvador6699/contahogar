import { createFileRoute } from '@tanstack/react-router'
import RecurringPage from '@/pages/RecurringPage'

const PrestamosUnifiedRoute = () => <RecurringPage initialTab="loans" />

export const Route = createFileRoute('/_app/prestamos')({
  component: PrestamosUnifiedRoute,
})
