const express = require('express');

const app = express();

app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ service: 'strategy-service', status: 'ok' });
});
app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

module.exports = app;
