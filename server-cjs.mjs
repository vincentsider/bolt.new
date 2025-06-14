import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middleware
app.use(compression());
app.use(morgan('tiny'));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dynamically import the build
const buildPath = path.join(__dirname, 'build/server/index.js');
import(buildPath).then((build) => {
  // Remix handler
  app.all('*', createRequestHandler({
    build: build,
    mode: process.env.NODE_ENV || 'production'
  }));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to load build:', error);
  process.exit(1);
});