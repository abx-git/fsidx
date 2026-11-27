import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const appName = 'LocalDir Index'
const appShortName = 'fsidx'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'schemas/**/*.json'],
      manifest: {
        name: appName,
        short_name: appShortName,
        description:
          'Ordner indexieren, durchsuchen und bearbeiten — rein im Browser, ohne Backend.',
        theme_color: '#059669',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'any',
        lang: 'de',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /\/e2-edit\.html/,
          /\/rbase-open\.html/,
          /\/schemas\//,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        e2Edit: path.resolve(__dirname, 'e2-edit.html'),
        rbaseOpen: path.resolve(__dirname, 'rbase-open.html'),
      },
    },
  },
  server: {
    port: 3847,
    strictPort: true,
  },
  preview: {
    port: 3847,
    strictPort: true,
  },
})