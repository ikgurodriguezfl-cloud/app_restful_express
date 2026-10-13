'use strict';

const VerticalSpread = require('../models/vertical-spread.model');
const input = require('./spread-input');

/**
 * Capa de servicios para Vertical Spreads.
 * Encapsula la lógica de negocio y operaciones de persistencia (MongoDB via Mongoose).
 */
class SpreadService {
  /**
   * Crea un nuevo Vertical Spread.
   * @param {Object} data - Datos del spread (incluye legs opcionales).
   * @returns {Promise<Object>} Spread creado con formato canónico.
   */
  async create(data) {
    input.fields(data, ['key', 'createdBy', 'legs', ...input.spreadFields], ['key', ...input.spreadRequired]);
    const spread = new VerticalSpread(data);
    spread.legs.forEach(leg => { leg.parentId = spread._id.toString(); });
    const saved = await spread.save();
    return saved.toJSON();
  }

  /**
   * Obtiene todos los spreads activos (no borrados).
   * @param {Object} filters - Filtros opcionales (underlyingTicker, strategyType, active).
   * @param {Object} options - Opciones de paginación (limit, skip, sort).
   * @returns {Promise<Object>} { data: Spread[], total: number }.
   */
  async findAll(filters = {}, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    const query = { deletedAt: null, ...filters };

    const [data, total] = await Promise.all([
      VerticalSpread.find(query).sort(sort).skip(skip).limit(limit).lean(),
      VerticalSpread.countDocuments(query),
    ]);

    return { data: data.map(d => VerticalSpread.hydrate(d).toJSON()), total };
  }

  /**
   * Obtiene un spread por su ID (MongoDB ObjectId o key).
   * @param {string} identifier - ID o key del spread.
   * @returns {Promise<Object|null>} Spread encontrado o null.
   */
  async findById(identifier) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isObjectId ? { _id: identifier } : { key: identifier };
    const spread = await VerticalSpread.findOne({ ...query, deletedAt: null }).lean();
    return spread ? VerticalSpread.hydrate(spread).toJSON() : null;
  }

  /**
   * Actualiza parcialmente un spread.
   * @param {string} id - ID del spread (ObjectId).
   * @param {Object} updates - Campos a actualizar.
   * @returns {Promise<Object|null>} Spread actualizado o null.
   */
  async updateById(id, updates) {
    input.fields(updates, input.spreadFields);
    const spread = await VerticalSpread.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    return spread ? VerticalSpread.hydrate(spread).toJSON() : null;
  }

  /**
   * Soft delete de un spread.
   * @param {string} id - ID del spread (ObjectId).
   * @param {string} deletedBy - Usuario que elimina.
   * @returns {Promise<Object|null>} Spread marcado como borrado o null.
   */
  async softDeleteById(id, deletedBy) {
    const spread = await VerticalSpread.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date(), active: false, updatedBy: deletedBy, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return spread ? VerticalSpread.hydrate(spread).toJSON() : null;
  }

  // ─── Legs (subdocumentos) ────────────────────────────────────────────────

  /**
   * Agrega/actualiza las 2 patas (legs) de un spread.
   * Reemplaza el array completo de legs (validación: exactamente 2).
   * @param {string} spreadId - ID del spread padre.
   * @param {Object[]} legs - Array de 2 legs.
   * @returns {Promise<Object|null>} Spread con legs actualizadas o null.
   */
  async setLegs(spreadId, legs) {
    if (!Array.isArray(legs) || legs.length !== 2) {
      input.fail('Un vertical spread debe tener exactamente 2 patas (legs).');
    }
    legs.forEach(leg => input.fields(leg, input.legFields, input.legRequired));
    const spread = await this.requireSpread(spreadId);
    spread.legs = legs.map(leg => ({ ...leg, parentId: spread._id.toString() }));
    await spread.save();
    return spread.toJSON();
  }

  async requireSpread(id) {
    input.spreadId(id);
    const spread = await VerticalSpread.findOne({ _id: id, deletedAt: null });
    if (!spread) input.fail('Spread no encontrado.', 404);
    return spread;
  }

  async replaceById(id, data) {
    input.fields(data, [...input.spreadFields, 'legs'], [...input.spreadRequired, 'legs']);
    const spread = await this.requireSpread(id);
    input.spreadFields.forEach(field => { spread[field] = data[field]; });
    if (!Array.isArray(data.legs) || ![0, 2].includes(data.legs.length)) input.fail('legs debe contener cero o dos patas.');
    data.legs.forEach(leg => input.fields(leg, input.legFields, input.legRequired));
    spread.legs = data.legs.map(leg => ({ ...leg, parentId: spread._id.toString() }));
    await spread.save();
    return spread.toJSON();
  }

  async runBatch(items, operation) {
    if (!Array.isArray(items) || !items.length || items.length > 100) input.fail('Cada lote requiere entre 1 y 100 elementos.');
    const results = [];
    for (let index = 0; index < items.length; index += 1) {
      try {
        results.push({ index, success: true, spread: await operation(items[index]) });
      } catch (error) {
        const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
        if (status >= 500) throw error;
        results.push({ index, success: false, status, message: error.message });
      }
    }
    return { atomic: false, results };
  }

  async getLeg(spreadId, legId) {
    input.legId(legId);
    const spread = await this.requireSpread(spreadId);
    const leg = spread.legs.find(item => item.id === legId && !item.deletedAt);
    if (!leg) input.fail('Pata no encontrada.', 404);
    return leg.toObject();
  }

  async getLegs(spreadId) {
    const spread = await this.requireSpread(spreadId);
    return spread.legs.map(leg => leg.toObject());
  }

  async changeLegs(spreadId, operations, { replace = false, remove = false } = {}) {
    if (!Array.isArray(operations) || !operations.length || operations.length > 100) input.fail('Se requieren entre 1 y 100 operaciones.');
    input.ids(operations.map(operation => operation?.legId));
    const spread = await this.requireSpread(spreadId);
    for (const operation of operations) {
      const index = spread.legs.findIndex(leg => leg.id === operation.legId && !leg.deletedAt);
      if (index < 0) input.fail('Pata no encontrada.', 404);
      const leg = spread.legs[index];
      if (remove) {
        leg.active = false;
        leg.deletedAt = new Date();
      } else {
        input.fields(operation.changes, input.legFields, replace ? input.legRequired : []);
        spread.legs[index] = {
          ...(replace ? {} : leg.toObject()), ...operation.changes,
          id: leg.id, parentId: spread._id.toString(), createdAt: leg.createdAt,
          active: leg.active, deletedAt: leg.deletedAt,
        };
      }
    }
    await spread.save();
    return spread.toJSON();
  }

}

module.exports = new SpreadService();
