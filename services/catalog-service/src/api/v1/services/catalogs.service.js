const Catalog = require('../models/Catalog');

// FIC: Todos los catálogos activos
const getCatalogsService = async () => {
  return Catalog.find({ active: true, deletedAt: null });
};

// FIC: Un catálogo por su key (ej. "institutos")
const getCatalogByKeyService = async (key) => {
  return Catalog.findOne({ key, active: true, deletedAt: null });
};

// FIC: Crear un nuevo catálogo
const postCatalogService = async (catalogData) => {
  const newCatalog = new Catalog(catalogData);
  return newCatalog.save();
};

// FIC: Actualizar un catálogo por su key
const putCatalogService = async (key, updateData) => {
  return Catalog.findOneAndUpdate(
    { key, active: true, deletedAt: null },
    updateData,
    { new: true },
  );
};

// FIC: Borrado lógico (Soft Delete)
const deleteCatalogService = async (key) => {
  return Catalog.findOneAndUpdate(
    { key, active: true, deletedAt: null },
    { active: false, deletedAt: new Date() },
    { new: true },
  );
};

// FIC: Borrado físico de la base de datos (Hard Delete)
const hardDeleteCatalogService = async (key) => {
  return Catalog.findOneAndDelete({ key });
};

module.exports = {
  getCatalogsService,
  getCatalogByKeyService,
  postCatalogService,
  putCatalogService,
  deleteCatalogService,
  hardDeleteCatalogService,
};
