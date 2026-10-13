'use strict';
const service = require('../services/spread.service');
const input = require('../services/spread-input');
const found = (value) => {
  if (value === null || value === undefined) input.fail('Spread no encontrado.', 404);
  return value;
};
const handle = (operation, status = 200) => async (req, res, next) => {
  try { res.status(status).json(found(await operation(req))); }
  catch (error) { next(error); }
};
const id = (req) => input.spreadId(req.params.id);
const parent = (req) => input.spreadId(req.params.spreadId);
const body = (req) => input.object(req.body);
module.exports = {
  listSpreads: handle(req => {
    const { underlyingTicker, strategyType, active, limit = 50, skip = 0, sort } = req.query;
    const filters = {};
    if (underlyingTicker) filters.underlyingTicker = String(underlyingTicker).toUpperCase();
    if (strategyType) filters.strategyType = String(strategyType).toLowerCase();
    if (active !== undefined) {
      if (!['true', 'false'].includes(active)) input.fail('active debe ser true o false.');
      filters.active = active === 'true';
    }
    if (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) input.fail('limit debe estar entre 1 y 100.');
    if (!Number.isInteger(Number(skip)) || Number(skip) < 0) input.fail('skip debe ser un entero no negativo.');
    let order = { createdAt: -1 };
    if (sort !== undefined) {
      try { order = JSON.parse(sort); } catch { input.fail('sort debe ser JSON válido.'); }
      input.object(order);
      if (Object.entries(order).some(([key, value]) => !['createdAt', 'updatedAt', 'underlyingTicker', 'strategyType'].includes(key) || ![1, -1].includes(value))) input.fail('Ordenamiento inválido.');
    }
    return service.findAll(filters, { limit: Number(limit), skip: Number(skip), sort: order });
  }),
  createSpread: handle(req => service.create(body(req)), 201),
  getSpread: handle(req => service.findById(req.params.id)),
  updateSpread: handle(req => service.updateById(id(req), input.fields(body(req), input.spreadFields))),
  replaceSpread: handle(req => service.replaceById(id(req), body(req))),
  deleteSpread: handle(async req => ({ message: 'Spread eliminado (soft delete)', spread: found(await service.softDeleteById(id(req), req.body?.deletedBy)) })),
  createSpreadsBatch: handle(req => service.runBatch(body(req).spreads, data => service.create(data)), 201),
  updateSpreadsBatch: handle(req => service.runBatch(body(req).operations, async operation => {
    input.object(operation);
    const spread = await service.updateById(input.spreadId(operation.spreadId), input.fields(operation.changes, input.spreadFields));
    return found(spread);
  })),
  deleteSpreadsBatch: handle(req => service.runBatch(body(req).spreadIds, async spreadId => found(await service.softDeleteById(input.spreadId(spreadId), req.body.deletedBy)))),
  getLegs: handle(req => service.getLegs(parent(req))),
  getLeg: handle(req => service.getLeg(parent(req), input.legId(req.params.legId))),
  setLegs: handle(req => service.setLegs(parent(req), req.body), 201),
  replaceLegs: handle(req => service.setLegs(parent(req), body(req).legs)),
  updateLeg: handle(req => service.changeLegs(parent(req), [{ legId: input.legId(req.params.legId), changes: body(req) }])),
  replaceLeg: handle(req => service.changeLegs(parent(req), [{ legId: input.legId(req.params.legId), changes: body(req) }], { replace: true })),
  deleteLeg: handle(async req => ({ message: 'Pata eliminada (soft delete)', spread: await service.changeLegs(parent(req), [{ legId: input.legId(req.params.legId) }], { remove: true }) })),
  updateLegsBatch: handle(req => service.changeLegs(parent(req), body(req).operations)),
  deleteLegsBatch: handle(req => service.changeLegs(parent(req), input.ids(body(req).legIds).map(legId => ({ legId })), { remove: true })),
};
