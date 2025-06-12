import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const serverBuildPath = join(process.cwd(), 'build/server/index.js');

try {
  let content = readFileSync(serverBuildPath, 'utf-8');
  
  // Fix the react-dom/server import
  content = content.replace(
    "import { renderToReadableStream } from 'react-dom/server';",
    "import ReactDOMServer from 'react-dom/server';\nconst { renderToReadableStream } = ReactDOMServer;"
  );
  
  writeFileSync(serverBuildPath, content);
  console.log('✅ Fixed server build imports');
} catch (error) {
  console.error('Error fixing build:', error);
  process.exit(1);
}