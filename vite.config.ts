import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fsidxPwaScopePlugin } from './vite-plugins/fsidx-pwa-scope.js'

const appName = 'LocalDir Index'
const appShortName = 'fsidx'
const basePath = process.env.VITE_BASE_PATH ?? '/'
const baseWithSlash = basePath.endsWith('/') ? basePath : `${basePath}/`
const icon = (file: string) => `${baseWithSlash}${file}`

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      scope: baseWithSlash,
      includeAssets: ['favicon.svg', 'icons.svg', 'schemas/**/*.json'],
      manifest: {
        id: `${baseWithSlash}`,
        name: appName,
        short_name: appShortName,
        description:
          'Ordner indexieren, durchsuchen und bearbeiten — rein im Browser, ohne Backend.',
        theme_color: '#059669',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: baseWithSlash,
        scope: baseWithSlash,
        orientation: 'any',
        lang: 'de',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: icon('pwa-192x192.png'),
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: icon('pwa-512x512.png'),
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: icon('pwa-512x512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        globIgnores: ['**/e2-edit.html', '**/rbase-open.html'],
        navigateFallback: `${baseWithSlash}index.html`,
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
        enabled: false,
      },
    }),
    fsidxPwaScopePlugin(),
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