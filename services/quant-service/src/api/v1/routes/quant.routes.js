const { Router } = require('express');
const quantController = require('../controllers/quant.controller');

const router = Router();

router.post('/prices', quantController.getPrices);
router.post('/greeks', quantController.getGreeks);
router.post('/implied-volatility', quantController.getImpliedVolatility);

module.exports = router;
