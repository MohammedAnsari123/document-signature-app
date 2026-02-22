import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://document-signature-app-u1zd.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
