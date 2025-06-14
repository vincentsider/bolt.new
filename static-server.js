const express = require('express');
const path = require('path');
const app = express();

// Serve the Remix client build
app.use(express.static('build/client'));
app.use(express.static('public'));

// For any route, serve a simple message
app.get('*', (req, res) => {
  res.send(`
    <html>
      <head><title>WorkflowHub</title></head>
      <body>
        <h1>WorkflowHub is Running in Kubernetes! 🎉</h1>
        <p>The full Remix app requires proper server-side rendering setup.</p>
        <p>This is a simplified static version to prove Kubernetes deployment works.</p>
        <hr>
        <p>Path requested: ${req.path}</p>
        <p>Server time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
