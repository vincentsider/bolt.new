import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import UnoCSS from "unocss/vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    nodePolyfills({
      include: ['path', 'buffer', 'process'],
    }),
    remix({
      serverModuleFormat: 'cjs',
      serverBuildFile: 'index.js',
    }),
    UnoCSS(),
    tsconfigPaths(),
  ],
  build: {
    target: 'esnext',
  },
  ssr: {
    noExternal: [
      '@anthropic-ai/sdk',
      'ai',
      '@ai-sdk/anthropic',
      'vite-plugin-node-polyfills',
    ],
    external: ['express', 'compression', 'morgan'],
  },
});
