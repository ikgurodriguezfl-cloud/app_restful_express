const { Router } = require('express');
const { getOptionChain } = require('../controllers/broker.controller');

const router = Router();

router.get('/options-chains', getOptionChain);

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
