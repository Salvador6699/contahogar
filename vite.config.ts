import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'logo.png'],
      manifest: {
        name: 'ContaHogar',
        short_name: 'ContaHogar',
        description: 'Gestor de finanzas personales y control de gastos del hogar',
        theme_color: '#1e3a5f',
        background_color: '#f4f6fa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nueva Transacción',
            short_name: 'Transacción',
            description: 'Ir a la pantalla principal',
            url: '/',
            icons: [{ src: 'logo.png', sizes: '192x192' }],
          },
          {
            name: 'Ver Presupuestos',
            short_name: 'Presupuestos',
            description: 'Ir a la sección de presupuestos',
            url: '/presupuestos',
            icons: [{ src: 'logo.png', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})

