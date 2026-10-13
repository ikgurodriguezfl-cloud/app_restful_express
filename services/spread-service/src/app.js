const express = require('express');
const apiRoutes = require('./routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'spread-service' });
});

app.use('/api/v1', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
  if (status >= 500) console.error('❌ ERROR:', error);
  res.status(status).json({
    message: status >= 500 ? 'Error interno del servidor.' : error.message,
  });
});

module.exports = app;
