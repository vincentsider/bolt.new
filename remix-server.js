const express = require('express');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

// Serve static assets
app.use('/assets', express.static('build/client/assets'));
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Remix handler
app.all('*', createRequestHandler({
  build: require('./build/server'),
  mode: process.env.NODE_ENV || 'production'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Remix app running on port ${PORT}`);
});