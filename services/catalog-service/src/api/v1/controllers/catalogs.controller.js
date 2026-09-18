const catalogsService = require('../services/catalogs.service');

// FIC: GET - Todos los catálogos
const getCatalogs = async (req, res, next) => {
  try {
    const catalogs = await catalogsService.getCatalogsService();
    res.status(200).json(catalogs);
  } catch (error) {
    next(error);
  }
};

// FIC: GET - Un catálogo por key
const getCatalogByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const catalog = await catalogsService.getCatalogByKeyService(key);

    if (!catalog) {
      return res.status(404).json({ message: `No se encontró el catálogo con key "${key}".` });
    }
    res.status(200).json(catalog);
  } catch (error) {
    next(error);
  }
};

// FIC: POST - Crear catálogo
const postCatalog = async (req, res, next) => {
  try {
    const newCatalog = await catalogsService.postCatalogService(req.body);
    res.status(201).json(newCatalog);
  } catch (error) {
    next(error);
  }
};

// FIC: PUT - Actualizar catálogo
const putCatalog = async (req, res, next) => {
  try {
    const { key } = req.params;
    const updatedCatalog = await catalogsService.putCatalogService(key, req.body);

    if (!updatedCatalog) {
      return res.status(400).json({ message: 'No se pudo actualizar el catálogo.' });
    }
    res.status(200).json(updatedCatalog);
  } catch (error) {
    next(error);
  }
};

// FIC: DELETE - Borrado lógico
const deleteCatalog = async (req, res, next) => {
  try {
    const { key } = req.params;
    const deletedCatalog = await catalogsService.deleteCatalogService(key);

    if (!deletedCatalog) {
      return res.status(404).json({ message: `No se encontró el catálogo con key "${key}".` });
    }
    res.status(200).json({ message: 'Catálogo eliminado correctamente.', deleted: deletedCatalog });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCatalogs,
  getCatalogByKey,
  postCatalog,
  putCatalog,
  deleteCatalog,
};
