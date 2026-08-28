import { createFileRoute } from '@tanstack/react-router';
import AsistentePage from '@/pages/AsistentePage';

export const Route = createFileRoute('/_app/asistente')({
  component: AsistentePage,
});
