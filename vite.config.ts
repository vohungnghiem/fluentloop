import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// '/' locally; '/fluentloop/' when built for GitHub Pages (set by the deploy workflow).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
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
        description: 'Học tiếng Anh dùng được trong công việc, theo kế hoạch 16 tuần.',
        lang: 'vi',
        start_url: base,
        scope: base,
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
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 3100, strictPort: true },
  preview: { port: 3100, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
