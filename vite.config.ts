import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      // Proxy Arc mainnet RPC through Vite to avoid CORS/403 from browser
      '/arc-rpc': {
        target: 'https://rpc.mainnet.arc.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arc-rpc/, ''),
      },
    },
  },
})
