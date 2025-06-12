import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createRequestHandler } from '@remix-run/express';

const app = express();

app.use(compression());
app.disable('x-powered-by');
app.use(express.static('build/client', { maxAge: '1h' }));
app.use(morgan('tiny'));

const BUILD_PATH = './build/server/index.js';

app.all('*', async (req, res, next) => {
  try {
    const build = await import(BUILD_PATH);
    const handler = createRequestHandler({ 
      build: build.default || build,
      mode: process.env.NODE_ENV 
    });
    return handler(req, res, next);
  } catch (error) {
    console.error('Error loading build:', error);
    res.status(500).send('Internal Server Error');
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ app ready: http://localhost:${port}`);
});