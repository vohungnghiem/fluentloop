import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable, and everything but AI works offline: the whole app is precached.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'logo.svg'],
      manifest: {
        name: 'FluentLoop',
        short_name: 'FluentLoop',
        description: 'Mỗi ngày 15 phút học tiếng Anh của chính công việc mình.',
        lang: 'vi',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF7F2',
        theme_color: '#FAF7F2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 3100, strictPort: true },
  preview: { port: 3100, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
