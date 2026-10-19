'use strict';

const express = require('express');
const router = express.Router();

const {
  listSpreads,
  createSpread,
  getSpread,
  updateSpread,
  deleteSpread,
  getLegs,
  setLegs,
  updateLeg,
  deleteLeg,
} = require('../controllers/spread.controller');

const extra = require('../controllers/spread.controller');
// Las rutas de lote preceden a /:id para evitar ambigüedad.
router.post('/batch', extra.createSpreadsBatch);
router.patch('/batch', extra.updateSpreadsBatch);
router.delete('/batch', extra.deleteSpreadsBatch);
router.put('/:id', extra.replaceSpread);
router.get('/:spreadId/legs/:legId', extra.getLeg);
router.put('/:spreadId/legs', extra.replaceLegs);
router.put('/:spreadId/legs/:legId', extra.replaceLeg);
router.patch('/:spreadId/legs', extra.updateLegsBatch);
router.delete('/:spreadId/legs', extra.deleteLegsBatch);
// ─── Vertical Spreads ─────────────────────────────────────────────────────


router.get('/', listSpreads);


router.post('/', createSpread);


router.get('/:id', getSpread);


router.patch('/:id', updateSpread);


router.delete('/:id', deleteSpread);

// ─── Legs (Subdocumentos) ─────────────────────────────────────────────────


router.get('/:spreadId/legs', getLegs);


router.post('/:spreadId/legs', setLegs);


router.patch('/:spreadId/legs/:legId', updateLeg);


router.delete('/:spreadId/legs/:legId', deleteLeg);

router.post('/:id/evaluations', extra.evaluateSpread);
module.exports = router;
