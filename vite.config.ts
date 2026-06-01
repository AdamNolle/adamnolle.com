import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Apex custom domain (adamnolle.com) is served from the site root.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
})
