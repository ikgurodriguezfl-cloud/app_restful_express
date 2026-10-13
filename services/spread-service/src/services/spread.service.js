'use strict';

const VerticalSpread = require('../models/vertical-spread.model');

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
    const spread = new VerticalSpread(data);
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
      throw new Error('Un vertical spread debe tener exactamente 2 patas (legs).');
    }
    const spread = await VerticalSpread.findOneAndUpdate(
      { _id: spreadId, deletedAt: null },
      { $set: { legs, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    return spread ? VerticalSpread.hydrate(spread).toJSON() : null;
  }

  /**
   * Obtiene las patas de un spread.
   * @param {string} spreadId - ID del spread padre.
   * @returns {Promise<Object[]|null>} Array de legs o null si no existe.
   */
  async getLegs(spreadId) {
    const spread = await VerticalSpread.findOne({ _id: spreadId, deletedAt: null }).lean();
    return spread ? spread.legs : null;
  }

  /**
   * Actualiza una pata específica dentro del spread.
   * @param {string} spreadId - ID del spread padre.
   * @param {string} legId - ID de la pata (UUID).
   * @param {Object} updates - Campos a actualizar en la pata.
   * @returns {Promise<Object|null>} Spread con pata actualizada o null.
   */
  async updateLeg(spreadId, legId, updates) {
    const spread = await VerticalSpread.findOne({ _id: spreadId, deletedAt: null });
    if (!spread) return null;

    const legIndex = spread.legs.findIndex(l => l.id === legId);
    if (legIndex === -1) return null;

    spread.legs[legIndex] = { ...spread.legs[legIndex].toObject(), ...updates };
    spread.updatedAt = new Date();
    await spread.save();
    return spread.toJSON();
  }

  /**
   * Elimina (soft delete) una pata específica.
   * Nota: Para mantener la integridad del vertical spread (2 legs), esto marca deletedAt.
   * @param {string} spreadId - ID del spread padre.
   * @param {string} legId - ID de la pata.
   * @returns {Promise<Object|null>} Spread con pata marcada como borrada o null.
   */
  async deleteLeg(spreadId, legId) {
    const spread = await VerticalSpread.findOne({ _id: spreadId, deletedAt: null });
    if (!spread) return null;

    const legIndex = spread.legs.findIndex(l => l.id === legId);
    if (legIndex === -1) return null;

    spread.legs[legIndex].deletedAt = new Date();
    spread.legs[legIndex].active = false;
    spread.updatedAt = new Date();
    await spread.save();
    return spread.toJSON();
  }
}

module.exports = new SpreadService();