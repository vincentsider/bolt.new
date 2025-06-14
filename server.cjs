const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

// Middleware
app.use(compression());
app.use(morgan('tiny'));

// Serve static files
app.use(express.static('build/client', { maxAge: '1h' }));

// Remix handler - dynamically import the ESM build
app.all('*', (req, res, next) => {
  import('./build/server/index.js').then((build) => {
    const handler = createRequestHandler({ build });
    handler(req, res, next);
  }).catch((error) => {
    console.error('Error loading build:', error);
    res.status(500).send('Internal Server Error');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
