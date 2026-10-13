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

// ─── Vertical Spreads ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/spreads:
 *   get:
 *     summary: Lista todos los vertical spreads
 *     tags: [Spreads]
 *     parameters:
 *       - in: query
 *         name: underlyingTicker
 *         schema: { type: string }
 *       - in: query
 *         name: strategyType
 *         schema: { type: string, enum: [bull_call, bear_call, bull_put, bear_put] }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista paginada de spreads
 */
router.get('/', listSpreads);

/**
 * @swagger
 * /api/v1/spreads:
 *   post:
 *     summary: Crea un nuevo vertical spread
 *     tags: [Spreads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, label, underlyingTicker, currentStockPrice, strategyType, spreadCategory, width, netDebitOrCredit, maxProfit, maxLoss, riskRewardRatio, breakEvenPrice, sigmaMultiplier, calculatedSigmaValue]
 *     responses:
 *       201:
 *         description: Spread creado
 */
router.post('/', createSpread);

/**
 * @swagger
 * /api/v1/spreads/{id}:
 *   get:
 *     summary: Obtiene un spread por ID o key
 *     tags: [Spreads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Spread encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', getSpread);

/**
 * @swagger
 * /api/v1/spreads/{id}:
 *   patch:
 *     summary: Actualiza parcialmente un spread
 *     tags: [Spreads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Spread actualizado
 */
router.patch('/:id', updateSpread);

/**
 * @swagger
 * /api/v1/spreads/{id}:
 *   delete:
 *     summary: Soft delete de un spread
 *     tags: [Spreads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Spread eliminado
 */
router.delete('/:id', deleteSpread);

// ─── Legs (Subdocumentos) ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/spreads/{spreadId}/legs:
 *   get:
 *     summary: Obtiene las patas de un spread
 *     tags: [Legs]
 *     parameters:
 *       - in: path
 *         name: spreadId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array de patas
 */
router.get('/:spreadId/legs', getLegs);

/**
 * @swagger
 * /api/v1/spreads/{spreadId}/legs:
 *   post:
 *     summary: Reemplaza las 2 patas del spread (set completo)
 *     tags: [Legs]
 *     parameters:
 *       - in: path
 *         name: spreadId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 2
 *             maxItems: 2
 *             items:
 *               type: object
 *               required: [contractSymbol, optionType, action, strike, expirationDate]
 *     responses:
 *       201:
 *         description: Patas establecidas
 */
router.post('/:spreadId/legs', setLegs);

/**
 * @swagger
 * /api/v1/spreads/{spreadId}/legs/{legId}:
 *   patch:
 *     summary: Actualiza una pata específica
 *     tags: [Legs]
 *     parameters:
 *       - in: path
 *         name: spreadId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: legId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pata actualizada
 */
router.patch('/:spreadId/legs/:legId', updateLeg);

/**
 * @swagger
 * /api/v1/spreads/{spreadId}/legs/{legId}:
 *   delete:
 *     summary: Soft delete de una pata específica
 *     tags: [Legs]
 *     parameters:
 *       - in: path
 *         name: spreadId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: legId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pata eliminada
 */
router.delete('/:spreadId/legs/:legId', deleteLeg);

module.exports = router;