const express = require('express');
const strategiesRoutes = require('./api/v1/routes/strategies.routes');

const app = express();

app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ service: 'strategy-service', status: 'ok' });
});
app.use('/api/v1/strategies', strategiesRoutes);
app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});
app.use((error, _req, res, _next) => {
  console.error('❌ ERROR strategy-service:', error);
  if (res.headersSent) return;
  if (error.name === 'ValidationError' && error.status === undefined) error.status = 422;
  if (error.name === 'CastError' || error.code === 11000) error.status = error.code === 11000 ? 409 : 400;
  if (error.type === 'entity.parse.failed') error.status = 400;
  res.status(error.status || 500).json({
    message: error.message || 'Error interno del servidor.',
  });
});

module.exports = app;
