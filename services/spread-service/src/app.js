const express = require('express');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'spread-service' });
});

app.listen(PORT, () => {
  console.log(`Spread-service corriendo en el puerto ${PORT}`);
});