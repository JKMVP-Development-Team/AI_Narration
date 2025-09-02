import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'apps/frontend',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
})