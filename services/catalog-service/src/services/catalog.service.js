const Catalog = require('../models/catalog.model');

class CatalogNotFoundError extends Error {
  constructor(id) {
    super(`Catalogo no encontrado: ${id}`);
    this.name = 'CatalogNotFoundError';
    this.statusCode = 404;
  }
}

const getCatalogs = async (filters = {}) => {
  const query = {};

  if (filters.includeDeleted !== true) {
    query.deletedAt = null;
  }

  if (filters.active !== undefined) {
    query.active = filters.active;
  }

  if (filters.collection) {
    query.collection = filters.collection;
  }

  return Catalog.find(query).sort({ sequence: 1, key: 1 }).exec();
};

const getCatalogById = async (id, options = {}) => {
  const query = { _id: id };

  if (options.includeDeleted !== true) {
    query.deletedAt = null;
  }

  const catalog = await Catalog.findOne(query).exec();

  if (!catalog) {
    throw new CatalogNotFoundError(id);
  }

  return catalog;
};

const createCatalog = async (data) => {
  const catalog = new Catalog(data);
  return catalog.save();
};

const updateCatalog = async (id, data) => {
  const catalog = await Catalog.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: data },
    {
      new: true,
      runValidators: true,
      context: 'query',
    },
  ).exec();

  if (!catalog) {
    throw new CatalogNotFoundError(id);
  }

  return catalog;
};

const deleteCatalog = async (id) => {
  const catalog = await Catalog.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      $set: {
        active: false,
        deletedAt: new Date(),
      },
    },
    { new: true },
  ).exec();

  if (!catalog) {
    throw new CatalogNotFoundError(id);
  }

  return catalog;
};

module.exports = {
  CatalogNotFoundError,
  getCatalogs,
  getCatalogById,
  createCatalog,
  updateCatalog,
  deleteCatalog,
};