import { copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Copy the Node.js entry server to replace the Cloudflare one
const nodeEntryServer = join(process.cwd(), 'app/entry.server.node.tsx');
const entryServer = join(process.cwd(), 'app/entry.server.tsx');
const backupEntryServer = join(process.cwd(), 'app/entry.server.cloudflare.tsx');

console.log('🔄 Preparing Railway build...');

// Backup the original entry server
copyFileSync(entryServer, backupEntryServer);
console.log('✅ Backed up Cloudflare entry server');

// Copy Node.js entry server
copyFileSync(nodeEntryServer, entryServer);
console.log('✅ Switched to Node.js entry server');

try {
  // Run the Remix build
  console.log('🏗️ Building application...');
  execSync('NODE_ENV=production remix build', { stdio: 'inherit' });
  console.log('✅ Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} finally {
  // Restore the original entry server
  copyFileSync(backupEntryServer, entryServer);
  console.log('✅ Restored Cloudflare entry server');
}