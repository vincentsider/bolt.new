const express = require('express');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

app.use(express.static('build/client'));
app.use(express.static('public'));

app.all('*', createRequestHandler({
  build: require('./build/server'),
  mode: process.env.NODE_ENV
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
