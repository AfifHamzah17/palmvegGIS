import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'logo-96.png'],
      manifest: {
        name: 'Dashboard Vegetatif TBM Kelapa Sawit PTPN Reg 1',
        short_name: 'Vegetatif TBM',
        description: 'Monitoring vegetatif TBM kelapa sawit PTPN IV Regional 1',
        theme_color: '#0E6B66',
        background_color: '#FFFFFF',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,json,woff2}'],
        globIgnores: ['**/data/batas/**'],
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: /\/data\/batas\/.*/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'batas-blok', expiration: { maxEntries: 20 } }
        }, {
          urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'esri-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 } }
        }]
      }
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          map: ['leaflet', 'react-leaflet']
        }
      }
    }
  }
});
