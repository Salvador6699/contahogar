import { createFileRoute } from '@tanstack/react-router'
import FavoritesPage from '@/pages/FavoritesPage'

export const Route = createFileRoute('/_app/favorites')({
  component: FavoritesPage,
})
