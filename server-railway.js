const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup
console.log('Starting Railway server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Serve static files
app.use(express.static(path.join(__dirname, 'build/client')));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes (placeholder - your app needs these)
app.post('/api/*', (req, res) => {
  res.status(501).json({ error: 'API not implemented for Railway' });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/client/index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Railway server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});