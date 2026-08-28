import { createFileRoute } from '@tanstack/react-router'
import TransferPage from '@/pages/TransferPage'

export const Route = createFileRoute('/_app/transferir')({
  component: TransferPage,
})
