import { vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    hmr: {
      port: 443,
    },
    // This is the key fix - allow all hosts in production
    allowedHosts: [
      '.railway.app',
      'localhost',
    ],
  },
  build: {
    target: 'esnext',
  },
  plugins: [
    nodePolyfills({
      include: ['path', 'buffer'],
    }),
    remixVitePlugin({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    UnoCSS(),
    tsconfigPaths(),
  ],
});