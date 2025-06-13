import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';

const app = express();

app.use(compression());
app.disable('x-powered-by');
app.use(express.static('build/client', { maxAge: '1h' }));
app.use(morgan('tiny'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'set' : 'not set'
    }
  });
});

const BUILD_PATH = './build/server/index.js';

app.all('*', async (req, res, next) => {
  try {
    const build = await import(BUILD_PATH);
    const handler = createRequestHandler({ 
      build: build.default || build,
      mode: process.env.NODE_ENV || 'production',
      getLoadContext: () => ({
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      })
    });
    return handler(req, res, next);
  } catch (error) {
    console.error('Error loading build:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ app ready: http://localhost:${port}`);
});