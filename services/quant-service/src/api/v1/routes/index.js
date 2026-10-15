const { Router } = require('express');
const quantRoutes = require('./quant.routes');
const strategiesRoutes = require('./strategies.routes');
const marketDataRoutes = require('./market-data.routes');
const brokerRoutes = require('./broker.routes');

const router = Router();

router.use('/quant', quantRoutes);
router.use('/strategies', strategiesRoutes);
router.use('/market-data', marketDataRoutes);
router.use('/broker', brokerRoutes);

module.exports = router;
