import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// NOTE: HTTPS is required so mobile browsers treat the LAN connection as a
// "secure context", which is mandatory for camera/getUserMedia() access on
// the QR scanner page. The basicSsl plugin generates a self-signed certificate.
// Mobile browsers will show a certificate warning on first visit — tap
// "Advanced → Proceed" to accept the self-signed cert.
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // allowedHosts: 'all' lets mobile devices on the LAN connect by IP
    // without Vite rejecting the request with a 403.
    allowedHosts: 'all',
    // https: true is implied when basicSsl() plugin is active.
    // Do NOT set https: false here or it will override the plugin.
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
        // secure: false is required because the frontend is now HTTPS
        // (self-signed cert). Without this, Vite refuses to forward
        // requests and the proxy silently fails → login loop.
        secure: false,
      },
      '/bookkeeping-api': {
        target: 'http://bookkeeping-service:4020',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/bookkeeping-api/, '')
      }
    }
  }
})
