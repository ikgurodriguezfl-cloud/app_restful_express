'use strict';

const spreadService = require('../services/spread.service');

/**
 * Helper para respuestas de error estandarizadas.
 */
const errorResponse = (res, status, message, detail = null) => {
  const body = { message };
  if (detail) body.detail = detail;
  return res.status(status).json(body);
};

/**
 * Helper para validar ObjectId de MongoDB.
 */
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// ─── Vertical Spreads CRUD ────────────────────────────────────────────────

/**
 * GET /api/v1/spreads
 * Lista spreads con filtros opcionales y paginación.
 * Query params: underlyingTicker, strategyType, active, limit, skip, sort
 */
async function listSpreads(req, res) {
  try {
    const { underlyingTicker, strategyType, active, limit, skip, sort } = req.query;
    const filters = {};
    if (underlyingTicker) filters.underlyingTicker = underlyingTicker.toUpperCase();
    if (strategyType) filters.strategyType = strategyType.toLowerCase();
    if (active !== undefined) filters.active = active === 'true';

    const options = {
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
    };

    const result = await spreadService.findAll(filters, options);
    res.json(result);
  } catch (err) {
    errorResponse(res, 400, 'Error al listar spreads', err.message);
  }
}

/**
 * POST /api/v1/spreads
 * Crea un nuevo Vertical Spread.
 * Body: { key, label, description, underlyingTicker, currentStockPrice, strategyType, spreadCategory, width, netDebitOrCredit, maxProfit, maxLoss, riskRewardRatio, breakEvenPrice, sigmaMultiplier, calculatedSigmaValue, legs?, createdBy }
 */
async function createSpread(req, res) {
  try {
    const spread = await spreadService.create(req.body);
    res.status(201).json(spread);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    errorResponse(res, status, 'Error al crear spread', err.message);
  }
}

/**
 * GET /api/v1/spreads/:id
 * Obtiene un spread por ID (ObjectId) o key.
 */
async function getSpread(req, res) {
  try {
    const { id } = req.params;
    const spread = await spreadService.findById(id);
    if (!spread) return errorResponse(res, 404, 'Spread no encontrado');
    res.json(spread);
  } catch (err) {
    errorResponse(res, 400, 'Error al obtener spread', err.message);
  }
}

/**
 * PATCH /api/v1/spreads/:id
 * Actualiza parcialmente un spread.
 * Body: campos permitidos del modelo (excluye _id, key, createdAt, legs).
 */
async function updateSpread(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return errorResponse(res, 400, 'ID inválido');

    const { _id, key, createdAt, legs, ...allowedUpdates } = req.body;
    const spread = await spreadService.updateById(id, allowedUpdates);
    if (!spread) return errorResponse(res, 404, 'Spread no encontrado');
    res.json(spread);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    errorResponse(res, status, 'Error al actualizar spread', err.message);
  }
}

/**
 * DELETE /api/v1/spreads/:id
 * Soft delete de un spread.
 * Body opcional: { deletedBy }
 */
async function deleteSpread(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return errorResponse(res, 400, 'ID inválido');

    const { deletedBy } = req.body;
    const spread = await spreadService.softDeleteById(id, deletedBy);
    if (!spread) return errorResponse(res, 404, 'Spread no encontrado');
    res.json({ message: 'Spread eliminado (soft delete)', spread });
  } catch (err) {
    errorResponse(res, 500, 'Error al eliminar spread', err.message);
  }
}

// ─── Legs (Subdocumentos) ────────────────────────────────────────────────

/**
 * GET /api/v1/spreads/:spreadId/legs
 * Obtiene las patas de un spread.
 */
async function getLegs(req, res) {
  try {
    const { spreadId } = req.params;
    if (!isValidObjectId(spreadId)) return errorResponse(res, 400, 'ID de spread inválido');

    const legs = await spreadService.getLegs(spreadId);
    if (legs === null) return errorResponse(res, 404, 'Spread no encontrado');
    res.json(legs);
  } catch (err) {
    errorResponse(res, 400, 'Error al obtener patas', err.message);
  }
}

/**
 * POST /api/v1/spreads/:spreadId/legs
 * Reemplaza las 2 patas del spread (set completo).
 * Body: [ { contractSymbol, optionType, action, strike, expirationDate, bid?, ask?, impliedVolatility?, delta?, gamma?, theta?, vega? }, ... ]
 * Debe enviar exactamente 2 legs.
 */
async function setLegs(req, res) {
  try {
    const { spreadId } = req.params;
    if (!isValidObjectId(spreadId)) return errorResponse(res, 400, 'ID de spread inválido');

    const legs = req.body;
    const spread = await spreadService.setLegs(spreadId, legs);
    if (!spread) return errorResponse(res, 404, 'Spread no encontrado');
    res.status(201).json(spread);
  } catch (err) {
    const status = err.message.includes('exactamente 2 patas') ? 400 : 500;
    errorResponse(res, status, 'Error al establecer patas', err.message);
  }
}

/**
 * PATCH /api/v1/spreads/:spreadId/legs/:legId
 * Actualiza una pata específica.
 * Body: campos permitidos de la pata (excluye id, parentId, createdAt).
 */
async function updateLeg(req, res) {
  try {
    const { spreadId, legId } = req.params;
    if (!isValidObjectId(spreadId)) return errorResponse(res, 400, 'ID de spread inválido');

    const { id, parentId, createdAt, ...allowedUpdates } = req.body;
    const spread = await spreadService.updateLeg(spreadId, legId, allowedUpdates);
    if (!spread) return errorResponse(res, 404, 'Spread o pata no encontrados');
    res.json(spread);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    errorResponse(res, status, 'Error al actualizar pata', err.message);
  }
}

/**
 * DELETE /api/v1/spreads/:spreadId/legs/:legId
 * Soft delete de una pata específica.
 */
async function deleteLeg(req, res) {
  try {
    const { spreadId, legId } = req.params;
    if (!isValidObjectId(spreadId)) return errorResponse(res, 400, 'ID de spread inválido');

    const spread = await spreadService.deleteLeg(spreadId, legId);
    if (!spread) return errorResponse(res, 404, 'Spread o pata no encontrados');
    res.json({ message: 'Pata eliminada (soft delete)', spread });
  } catch (err) {
    errorResponse(res, 500, 'Error al eliminar pata', err.message);
  }
}

module.exports = {
  listSpreads,
  createSpread,
  getSpread,
  updateSpread,
  deleteSpread,
  getLegs,
  setLegs,
  updateLeg,
  deleteLeg,
};