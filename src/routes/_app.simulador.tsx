import { createFileRoute } from '@tanstack/react-router'
import CashflowSimulatorPage from '@/pages/CashflowSimulatorPage'

export const Route = createFileRoute('/_app/simulador')({
  component: CashflowSimulatorPage,
})
