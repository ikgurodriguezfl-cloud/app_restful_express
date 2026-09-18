const { Router } = require('express');
const catalogsController = require('../controllers/catalogs.controller');

const router = Router();

// GET /api/v1/catalogs
router.get('/', catalogsController.getCatalogs);

// GET /api/v1/catalogs/:key
router.get('/:key', catalogsController.getCatalogByKey);

// POST /api/v1/catalogs
router.post('/', catalogsController.postCatalog);

// PUT /api/v1/catalogs/:key
router.put('/:key', catalogsController.putCatalog);

// DELETE /api/v1/catalogs/:key
router.delete('/:key', catalogsController.deleteCatalog);

module.exports = router;
