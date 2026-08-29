import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { adminApiPlugin } from './src/server/dev-server-plugin.js'

export default defineConfig({
  plugins: [
    react(),
    adminApiPlugin(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
    allowedHosts: ['jjmow.tail7fa36c.ts.net'],
  },
})
