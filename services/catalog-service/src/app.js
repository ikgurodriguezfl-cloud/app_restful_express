const express = require('express');

const apiRoutes = require('./api/v1/routes');

const app = express();

// FIC: Middlewares generales
app.use(express.json());

// FIC: Healthcheck (ya existía desde la sección C)
app.get('/health', (_request, response) => {
  response.json({ service: 'catalog-service', status: 'ok' });
});

// FIC: Montamos todas las rutas de la API bajo /api/v1
app.use('/api/v1', apiRoutes);

// FIC: 404 - ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// FIC: Middleware para el manejo de errores (siempre al final)
app.use((error, req, res, next) => {
  console.error('❌ ERROR:', error);
  res.status(error.status || 500).json({
    message: error.message || 'Error interno del servidor.',
  });
});

module.exports = app;
