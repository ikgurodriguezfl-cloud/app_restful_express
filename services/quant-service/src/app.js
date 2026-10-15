const express = require('express');
const cors = require('cors');

const apiRoutes = require('./api/v1/routes');

const app = express();

// CORS: permitir peticiones desde la GUI (localhost:3005) y otros orígenes en desarrollo
app.use(cors({
  origin: ['http://localhost:3005', 'http://127.0.0.1:3005', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
