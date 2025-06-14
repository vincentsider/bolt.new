const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');

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
