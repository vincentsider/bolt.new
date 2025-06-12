import fs from 'fs';
import path from 'path';

const serverBuildPath = path.join(process.cwd(), 'build/server/index.js');

// Read the built server file
let content = fs.readFileSync(serverBuildPath, 'utf-8');

// Fix the renderToReadableStream import issue
// Replace the destructured import with a namespace import and access
content = content.replace(
  /import\s*{\s*renderToReadableStream\s*}\s*from\s*['"]react-dom\/server['"]/g,
  `import * as ReactDOMServer from 'react-dom/server'`
);

// Replace all instances of renderToReadableStream with ReactDOMServer.renderToReadableStream
content = content.replace(
  /(?<!ReactDOMServer\.)renderToReadableStream/g,
  'ReactDOMServer.renderToReadableStream'
);

// Write the patched content back
fs.writeFileSync(serverBuildPath, content);

console.log('✅ Patched server build for ESM/CJS compatibility');