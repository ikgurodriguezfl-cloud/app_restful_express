const express = require('express');
const { port } = require('./config/env');

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ service: 'catalog-service', status: 'ok' });
});

app.listen(port, () => {
  console.log(`catalog-service listening on port ${port}`);
});
