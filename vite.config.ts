import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  if (mode === 'single') {
    // One self-contained index.html (for quick sharing / preview); no service worker.
    return { base: './', plugins: [react(), viteSingleFile()], build: { outDir: 'dist-single' } };
  }
  return {
    // Relative base: works at any GitHub Pages path (/<repo>/) or domain root.
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
        workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'] },
        manifest: {
          name: 'CalcOil',
          short_name: 'CalcOil',
          description: 'Oil quantity calculation (KA/RU/EN): API MPMS 11.1-2004, ASTM D1250-80, GOST 3900',
          lang: 'ka',
          scope: '.',
          theme_color: '#0b5a70',
          background_color: '#e9eef0',
          display: 'standalone',
          start_url: '.',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  };
});
