const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { catalogServiceUrl } = require('./config/env');
const app = express();

app.get('/health', (_request, response) => {
  response.json({ service: 'api-gateway', status: 'ok' });
});

app.use(
  createProxyMiddleware({
    target: catalogServiceUrl,
    changeOrigin: true,
    pathFilter: '/api/v1/catalogs',
    on: {
      error: (err, req, res) => {
        console.error('❌ Error de proxy hacia catalog-service:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({
          message: 'No se pudo contactar al catalog-service.',
          detail: err.message,
        }));
      },
    },
  }),
);

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

module.exports = app;