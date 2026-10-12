const { Router } = require('express');

const router = Router();

router.get('/options-chains', (_request, response) => {
  response.status(200).json({
    symbol: 'AAPL',
    provider: 'demo-provider',
    capturedAt: new Date().toISOString(),
    expirations: ['2026-12-18'],
    contracts: [],
    message: 'Cadena de opciones preparada para integración con el proveedor real.',
  });
});

router.post('/options-chains/ingestions', (_request, response) => {
  response.status(202).json({
    ingestionId: `ingestion-${Date.now()}`,
    status: 'queued',
    provider: 'demo-provider',
    symbol: 'AAPL',
    counts: {
      received: 0,
      normalized: 0,
      rejected: 0,
    },
  });
});

module.exports = router;
