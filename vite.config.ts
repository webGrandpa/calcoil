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
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'VCF · დაშვება / Поправка',
          short_name: 'VCF',
          description: 'Oil quantity calculation (KA/RU/EN): API MPMS 11.1-2004, ASTM D1250-80, GOST 3900',
          lang: 'ka',
          scope: '.',
          theme_color: '#0f5c8c',
          background_color: '#f3f1ec',
          display: 'standalone',
          start_url: '.',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  };
});
