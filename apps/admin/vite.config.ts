import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { adminApiPlugin } from './src/server/dev-server-plugin.js'

export default defineConfig({
  plugins: [
    react(),
    adminApiPlugin(),
  ],
  server: {
    port: 5174,
    strictPort: false,
  },
})
