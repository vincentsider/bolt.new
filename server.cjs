const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Logging
app.use(morgan('tiny'));

// Compression
app.use(compression());

// Disable x-powered-by header
app.disable('x-powered-by');

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'build/client/assets'), {
  immutable: true,
  maxAge: '1y'
}));

app.use(express.static(path.join(__dirname, 'build/client'), {
  maxAge: '1h'
}));

// For now, serve the static HTML for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});