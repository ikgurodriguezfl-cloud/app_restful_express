const { Router } = require('express');
const catalogsRoutes = require('./catalogs.routes');
const quantRoutes = require('./quant.routes');
const strategiesRoutes = require('./strategies.routes');

const router = Router();

router.use('/catalogs', catalogsRoutes);
router.use('/quant', quantRoutes);
router.use('/strategies', strategiesRoutes);

module.exports = router;
