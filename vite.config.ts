import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** When and from which commit this build was made; shown in Settings. */
const define = {
  __APP_BUILD__: JSON.stringify(new Date().toISOString()),
  __APP_COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)),
};

/** The single-file build has no service worker: give it a registerSW that does nothing. */
const pwaStub: Plugin = {
  name: 'pwa-register-stub',
  resolveId: (id) => (id.startsWith('virtual:pwa-register') ? '\0pwa-register-stub' : null),
  load: (id) => (id === '\0pwa-register-stub' ? 'export function registerSW() { return () => Promise.resolve(); }' : null),
};

export default defineConfig(({ mode }) => {
  if (mode === 'single') {
    // One self-contained index.html (for quick sharing / preview); no service worker.
    return { base: './', define, plugins: [react(), pwaStub, viteSingleFile()], build: { outDir: 'dist-single' } };
  }
  return {
    // Relative base: works at any GitHub Pages path (/<repo>/) or domain root.
    base: './',
    define,
    plugins: [
      react(),
      VitePWA({
        // A new version waits until the user taps "Update" (src/app/pwa.ts).
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
        workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'], cleanupOutdatedCaches: true },
        manifest: {
          name: 'CalcOil',
          short_name: 'CalcOil',
          description: 'Loading master’s worktable: tank gauging, shore figures and ullage report (KA/RU/EN)',
          lang: 'ka',
          scope: '.',
          theme_color: '#e2e7ea',
          background_color: '#e2e7ea',
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
