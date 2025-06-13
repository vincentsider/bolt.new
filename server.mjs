import { createRequestHandler } from '@remix-run/express';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';

const app = express();

app.use(compression());
app.disable('x-powered-by');
app.use(express.static('build/client'));
app.use(morgan('tiny'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  console.error('Stack:', err.stack);
  res.status(500).send('Internal Server Error');
});

const mode = process.env.NODE_ENV || 'production';

// Wrap the handler to catch async errors
const handler = createRequestHandler({
  build: async () => {
    try {
      const build = await import('./build/server/index.js');
      return build;
    } catch (error) {
      console.error('Failed to import build:', error);
      throw error;
    }
  },
  mode,
  getLoadContext() {
    return {};
  },
});

app.all('*', async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    console.error('Handler error:', error);
    next(error);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Express server listening on port ${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});