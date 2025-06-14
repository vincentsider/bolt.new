#!/bin/bash
# Script to refactor WorkflowHub from Cloudflare Workers to Node.js

set -e

echo "🔄 Refactoring WorkflowHub for Kubernetes deployment..."

# Backup original files
echo "Creating backups..."
cp app/entry.server.tsx app/entry.server.cloudflare.backup.tsx 2>/dev/null || true
cp vite.config.ts vite.config.cloudflare.backup.ts 2>/dev/null || true

# 1. Update entry.server.tsx to use Node.js version
echo "Updating entry server..."
cp app/entry.server.node.tsx app/entry.server.tsx

# 2. Create a script to update all imports
echo "Creating import update script..."
cat > update-imports.mjs << 'EOF'
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

async function updateImports() {
  const files = await glob(['app/**/*.ts', 'app/**/*.tsx'], {
    ignore: ['**/*.backup.*']
  });

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace Cloudflare imports with Node imports
    if (content.includes('@remix-run/cloudflare')) {
      content = content.replace(/@remix-run\/cloudflare/g, '@remix-run/node');
      modified = true;
    }

    // Update LoaderFunctionArgs and ActionFunctionArgs
    if (content.includes('LoaderFunctionArgs') || content.includes('ActionFunctionArgs')) {
      // Ensure we're importing from @remix-run/node
      if (!content.includes("from '@remix-run/node'") && modified) {
        content = content.replace(
          /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@remix-run\/node['"]/,
          (match, imports) => {
            const importList = imports.split(',').map(i => i.trim());
            if (!importList.includes('LoaderFunctionArgs')) importList.push('LoaderFunctionArgs');
            if (!importList.includes('ActionFunctionArgs')) importList.push('ActionFunctionArgs');
            return `import { ${importList.join(', ')} } from '@remix-run/node'`;
          }
        );
      }
      modified = true;
    }

    // Replace context.cloudflare.env with process.env
    if (content.includes('context.cloudflare.env')) {
      content = content.replace(/context\.cloudflare\.env/g, 'process.env');
      modified = true;
    }

    // Replace context.env with process.env
    if (content.includes('context.env')) {
      content = content.replace(/context\.env\.([A-Z_]+)/g, 'process.env.$1');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated: ${file}`);
    }
  }
}

updateImports().catch(console.error);
EOF

# Run the import update script
echo "Updating imports across the codebase..."
node update-imports.mjs

# 3. Update vite.config.ts
echo "Updating Vite config..."
cat > vite.config.ts << 'EOF'
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
      serverModuleFormat: 'esm',
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
    ],
  },
});
EOF

# 4. Create Node.js server
echo "Creating Node.js server..."
cat > server.js << 'EOF'
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import * as build from './build/server/index.js';

const app = express();

// Middleware
app.use(compression());
app.use(morgan('tiny'));

// Serve static files
app.use(express.static('build/client', { maxAge: '1h' }));

// Remix handler
app.all('*', createRequestHandler({ build }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
EOF

# 5. Update package.json scripts
echo "Updating package.json..."
node -e "
const pkg = require('./package.json');
pkg.scripts.build = 'remix vite:build';
pkg.scripts.start = 'NODE_ENV=production node server.js';
pkg.scripts['start:docker'] = 'NODE_ENV=production node server.js';
pkg.type = 'module';
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# 6. Install Node.js dependencies
echo "Installing Node.js dependencies..."
pnpm remove @remix-run/cloudflare @remix-run/cloudflare-pages wrangler @cloudflare/workers-types 2>/dev/null || true
pnpm add @remix-run/node @remix-run/express express compression morgan

# 7. Clean up the update script
rm update-imports.mjs

echo "✅ Refactoring complete! The app is now ready for Node.js/Kubernetes deployment."
echo ""
echo "Next steps:"
echo "1. Run 'pnpm install' to ensure all dependencies are installed"
echo "2. Run 'pnpm run build' to build the app"
echo "3. Run 'pnpm run start' to test the Node.js server locally"
echo "4. Run './k8s-deploy-node.sh' to deploy to Kubernetes"
EOF

chmod +x k8s/refactor-to-node.sh