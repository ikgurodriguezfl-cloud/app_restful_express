const express = require('express');
const { port } = require('./config/env');

const spreadRoutes = require('./routes/spread.routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'spread-service' });
});

app.use('/api/v1/spreads', spreadRoutes);

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