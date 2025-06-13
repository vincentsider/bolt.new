import { vitePlugin as remix } from '@remix-run/dev';
import { cloudflareDevProxyVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((config) => {
  const isProduction = config.mode === 'production';
  
  return {
    server: {
      host: true,
    },
    build: {
      target: 'esnext',
    },
    plugins: [
      nodePolyfills({
        include: ['path', 'buffer'],
      }),
      !isProduction && cloudflareDevProxyVitePlugin(),
      remix({
        serverModuleFormat: 'esm',
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
        },
      }),
      UnoCSS(),
      tsconfigPaths(),
      isProduction && optimizeCssModules({ apply: 'build' }),
    ],
  };
});