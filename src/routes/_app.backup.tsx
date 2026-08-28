import { createFileRoute } from '@tanstack/react-router'
import BackupPage from '@/pages/BackupPage'

export const Route = createFileRoute('/_app/backup')({
  component: BackupPage,
})
