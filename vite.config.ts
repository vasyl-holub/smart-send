/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    projects: [
      // Transport and logic: plain Node.
      { extends: true, test: { name: 'node', environment: 'node', include: ['src/**/*.test.ts'] } },
      // Rendered UI: a DOM is needed.
      { extends: true, test: { name: 'dom', environment: 'jsdom', include: ['src/**/*.test.tsx'] } },
    ],
  },
})
