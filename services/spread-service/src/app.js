const express = require('express');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'spread-service' });
});

// Nota: el listen se hace desde server.js para evitar doble escucha
module.exports = app;