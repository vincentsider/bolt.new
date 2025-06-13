import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== SERVER DEBUG START ===');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 3000);

// Check if build exists
const buildServerPath = join(__dirname, 'build', 'server', 'index.js');
const buildClientPath = join(__dirname, 'build', 'client');

console.log('\n=== BUILD CHECK ===');
console.log('Server build exists:', fs.existsSync(buildServerPath));
console.log('Client build exists:', fs.existsSync(buildClientPath));

if (fs.existsSync(buildServerPath)) {
  console.log('Server build size:', fs.statSync(buildServerPath).size, 'bytes');
}

// Create minimal Express app
const app = express();

// Health check that always works
app.get('/health', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    node: process.version,
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    buildExists: fs.existsSync(buildServerPath)
  });
});

// Root route for testing
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>WorkflowHub Debug Server</h1>
        <p>Server is running!</p>
        <p>Environment: ${process.env.NODE_ENV || 'not set'}</p>
        <p>Build exists: ${fs.existsSync(buildServerPath) ? 'Yes' : 'No'}</p>
        <p><a href="/health">Check Health</a></p>
      </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;

console.log('\n=== STARTING SERVER ===');
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Debug server ready on port ${port}`);
  console.log(`Test URL: http://localhost:${port}`);
  console.log(`Health URL: http://localhost:${port}/health`);
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('=== SERVER DEBUG END ===\n');