import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(compression());
app.disable('x-powered-by');

// Serve static files
const publicPath = join(__dirname, 'build', 'client');
app.use(express.static(publicPath, { maxAge: '1h' }));

// Logging
app.use(morgan('tiny'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL || 'not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'set' : 'not set'
    },
    paths: {
      __dirname,
      publicPath,
      cwd: process.cwd()
    }
  });
});

// Import and use the Remix app
const BUILD_PATH = join(__dirname, 'build', 'server', 'index.js');

console.log('Starting server...');
console.log('Build path:', BUILD_PATH);
console.log('Public path:', publicPath);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Create request handler
let handler;

const initializeHandler = async () => {
  try {
    console.log('Loading Remix build...');
    const build = await import(BUILD_PATH);
    console.log('Build loaded successfully');
    
    handler = createRequestHandler({ 
      build: build.default || build,
      mode: process.env.NODE_ENV || 'production',
      getLoadContext: () => ({
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      })
    });
    
    console.log('Request handler created successfully');
  } catch (error) {
    console.error('Failed to initialize handler:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Initialize handler before starting server
await initializeHandler();

// Handle all requests
app.all('*', async (req, res, next) => {
  if (!handler) {
    console.error('Handler not initialized');
    return res.status(500).json({ 
      error: 'Server not ready',
      message: 'Request handler not initialized'
    });
  }
  
  try {
    return handler(req, res, next);
  } catch (error) {
    console.error('Request handler error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ app ready: http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});