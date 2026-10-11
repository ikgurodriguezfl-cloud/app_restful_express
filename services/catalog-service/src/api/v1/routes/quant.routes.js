const { Router } = require('express');
const quantController = require('../controllers/quant.controller');

const router = Router();

router.post('/price', quantController.priceOption);
router.post('/iv', quantController.impliedVolatility);
router.post('/pnl', quantController.scenarioPnl);

module.exports = router;
