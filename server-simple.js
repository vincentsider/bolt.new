const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const { createRequestHandler } = require('@remix-run/express');

const app = express();

app.use(compression());
app.disable('x-powered-by');
app.use(express.static('build/client'));
app.use(morgan('tiny'));

const BUILD_DIR = './build/server';

app.all('*', 
  createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV || 'production',
  })
);

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server started on port ${port}`);
});