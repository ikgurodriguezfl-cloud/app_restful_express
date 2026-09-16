const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (_request, response) => {
  response.json({ service: 'api-gateway', status: 'ok' });
});

app.listen(port, () => {
  console.log(`api-gateway listening on port ${port}`);
});
