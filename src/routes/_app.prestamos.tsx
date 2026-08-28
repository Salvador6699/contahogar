import { createFileRoute } from '@tanstack/react-router'
import LoansPage from '@/pages/LoansPage'

export const Route = createFileRoute('/_app/prestamos')({
  component: LoansPage,
})
