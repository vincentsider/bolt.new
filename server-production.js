const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

// Middleware
app.use(compression());
app.use(morgan('tiny'));

// Serve static files
app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
app.use(express.static('public', { maxAge: '1h' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Remix handler
app.all('*', createRequestHandler({
  build: require('./build/server'),
  mode: process.env.NODE_ENV || 'production'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});