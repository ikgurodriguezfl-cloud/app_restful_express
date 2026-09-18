const { Router } = require('express');
const catalogsRoutes = require('./catalogs.routes');

const router = Router();

router.use('/catalogs', catalogsRoutes);

module.exports = router;
