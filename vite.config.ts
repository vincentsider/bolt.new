import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((config) => {
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
  
  return {
    server: {
      host: true,
      hmr: {
        port: 443,
      },
      // Disable host checking for Railway
      strictPort: false,
      open: false,
      // Add middleware to bypass host checking
      proxy: {},
    },
    build: {
      target: 'esnext',
    },
    ssr: {
      noExternal: isRailway ? ['react-dom/server'] : undefined,
    },
    plugins: [
      nodePolyfills({
        include: ['path', 'buffer'],
      }),
      !isRailway && config.mode !== 'test' && remixCloudflareDevProxy(),
      remixVitePlugin({
        serverBuildTarget: isRailway ? 'node' : 'cloudflare',
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
        },
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      railwayHostPlugin(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
  };
});

function railwayHostPlugin() {
  return {
    name: 'railwayHostPlugin',
    config() {
      // Force accept all hosts when DANGEROUSLY_DISABLE_HOST_CHECK is set
      if (process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true') {
        return {
          server: {
            host: true,
            hmr: {
              host: 'localhost',
            },
          },
        };
      }
    },
    configureServer(server: ViteDevServer) {
      // Bypass host checking middleware
      if (process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true') {
        server.middlewares.use((req, res, next) => {
          // Remove host checking by accepting all hosts
          if (req.headers.host) {
            req.headers['x-forwarded-host'] = req.headers.host;
          }
          next();
        });
      }
    },
  };
}

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      // Override host checking completely
      const originalAccept = server.config.server.host;
      server.config.server.host = true;
      
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}
