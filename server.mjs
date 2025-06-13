import { createRequestHandler } from '@remix-run/express';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';

const app = express();

app.use(compression());
app.disable('x-powered-by');
app.use(express.static('build/client'));
app.use(morgan('tiny'));

const mode = process.env.NODE_ENV || 'production';

app.all('*', createRequestHandler({
  build: () => import('./build/server/index.js'),
  mode,
  getLoadContext() {
    return {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    };
  },
}));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Express server listening on port ${port}`);
});