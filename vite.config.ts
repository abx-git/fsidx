import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        e2Edit: path.resolve(__dirname, 'e2-edit.html'),
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