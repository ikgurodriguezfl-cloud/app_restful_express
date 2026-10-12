const express = require('express');

const apiRoutes = require('./api/v1/routes');

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ service: 'quant-service', status: 'ok' });
});

app.use('/api/v1', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, next) => {
  console.error('❌ ERROR:', error);
  res.status(error.status || 500).json({
    message: error.message || 'Error interno del servidor.',
  });
});

module.exports = app;
