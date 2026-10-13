const mongoose = require('mongoose');
const VerticalSpread = require('../models/vertical-spread.model');
const {
  VERTICAL_STRATEGIES,
  ValidationError,
  buildVertical,
  evaluateVertical,
  normalizeStrategyType,
  strategyDefinition,
  validateVertical,
} = require('../../../domain/verticals');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

const toJSON = (setup) => setup.toJSON();

const toStrategyInput = (spread) => {
  const record = spread.toObject ? spread.toObject() : spread;
  return {
    ...record,
    strategyType: normalizeStrategyType(record.strategyType),
    symbol: record.underlyingTicker || record.symbol,
    underlyingPrice: record.currentStockPrice ?? record.underlyingPrice,
    expiration: record.expiration || record.legs?.[0]?.expirationDate,
    legs: (record.legs || []).map((leg) => ({
      ...leg,
      symbol: record.underlyingTicker || record.symbol,
      type: leg.optionType || leg.type,
      side: leg.action || leg.side,
      expiration: leg.expirationDate || leg.expiration,
      quantity: leg.quantity === undefined ? 1 : leg.quantity,
    })),
  };
};

const toStrategyCode = (strategyType) => normalizeStrategyType(strategyType)
  .replace(/_SPREAD$/, '')
  .toLowerCase();

const createContractSymbol = (symbol, optionType, expiration, strike) => {
  const datePart = expiration.replace(/-/g, '').slice(2);
  const strikePart = String(Math.round(strike * 1000)).padStart(8, '0');
  return `${symbol}${datePart}${optionType === 'call' ? 'C' : 'P'}${strikePart}`;
};

const toSpreadFields = (input, existing = {}) => {
  const validated = validateVertical(input);
  const evaluation = evaluateVertical(validated);
  const currentStockPrice = Number(
    input.currentStockPrice ?? input.underlyingPrice ?? existing.currentStockPrice,
  );
  const sigmaMultiplier = Number(input.sigmaMultiplier ?? existing.sigmaMultiplier);
  const calculatedSigmaValue = Number(input.calculatedSigmaValue ?? existing.calculatedSigmaValue);

  if (!Number.isFinite(currentStockPrice) || currentStockPrice <= 0) {
    throw new ValidationError('currentStockPrice es obligatorio y debe ser mayor que cero.');
  }
  if (!Number.isFinite(sigmaMultiplier) || sigmaMultiplier < 0) {
    throw new ValidationError('sigmaMultiplier es obligatorio y debe ser mayor o igual a cero.');
  }
  if (!Number.isFinite(calculatedSigmaValue) || calculatedSigmaValue < 0) {
    throw new ValidationError('calculatedSigmaValue es obligatorio y debe ser mayor o igual a cero.');
  }

  const strategyType = toStrategyCode(validated.strategyType);
  const strikes = validated.legs.map((leg) => leg.strike).sort((a, b) => a - b);
  const key = String(input.key || existing.key || [
    strategyType,
    validated.symbol.toLowerCase(),
    validated.expiration.replace(/-/g, '_'),
    ...strikes,
  ].join('_'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const definition = strategyDefinition(validated.strategyType);

  return {
    validated,
    evaluation,
    fields: {
      key,
      label: String(input.label || existing.label || `${definition.name} ${validated.symbol}`).trim(),
      description: input.description === undefined
        ? (existing.description || definition.description)
        : input.description,
      underlyingTicker: validated.symbol,
      currentStockPrice,
      strategyType,
      spreadCategory: evaluation.spreadCategory,
      width: evaluation.width,
      netDebitOrCredit: evaluation.netDebitOrCredit,
      maxProfit: evaluation.maxProfit,
      maxLoss: evaluation.maxLoss,
      riskRewardRatio: evaluation.riskRewardRatio,
      breakEvenPrice: evaluation.breakEvenPrice,
      sigmaMultiplier,
      calculatedSigmaValue,
      active: input.active === undefined ? (existing.active ?? true) : input.active,
      deletedAt: input.deletedAt === undefined ? (existing.deletedAt ?? null) : input.deletedAt,
      createdBy: input.createdBy === undefined ? existing.createdBy : input.createdBy,
      updatedBy: input.updatedBy === undefined ? existing.updatedBy : input.updatedBy,
      userId: input.userId === undefined ? existing.userId : input.userId,
      notes: input.notes === undefined ? existing.notes : input.notes,
      lastEvaluation: input.lastEvaluation === undefined
        ? (existing.lastEvaluation ?? evaluation)
        : input.lastEvaluation,
      legs: validated.legs.map((leg) => ({
        id: leg.id,
        contractSymbol: leg.contractSymbol
          || createContractSymbol(validated.symbol, leg.type, leg.expiration, leg.strike),
        optionType: leg.type,
        action: leg.side,
        strike: leg.strike,
        expirationDate: leg.expiration,
        bid: leg.bid === null && leg.side === 'sell' ? leg.price : leg.bid,
        ask: leg.ask === null && leg.side === 'buy' ? leg.price : leg.ask,
        impliedVolatility: leg.impliedVolatility,
        delta: leg.delta,
        gamma: leg.gamma,
        theta: leg.theta,
        vega: leg.vega,
        quantity: leg.quantity,
        active: leg.active,
        deletedAt: leg.deletedAt,
      })),
    },
  };
};

const getTypesService = (phase) => {
  if (phase && phase.toUpperCase() !== 'F3') return [];
  return Object.entries(VERTICAL_STRATEGIES).map(([strategyKey, definition]) => ({
    strategyType: toStrategyCode(strategyKey),
    phase: 'F3',
    name: definition.name,
    optionType: definition.optionType,
    legs: 2,
    premiumType: definition.premiumType,
    description: definition.description,
  }));
};

const getTypeByNameService = (strategyType) => {
  const definition = strategyDefinition(strategyType);
  return {
    strategyType: toStrategyCode(definition.strategyType),
    phase: 'F3',
    name: definition.name,
    optionType: definition.optionType,
    legs: 2,
    premiumType: definition.premiumType,
    description: definition.description,
  };
};

const createSetupService = async (data) => {
  const { fields } = toSpreadFields(data);
  const setup = new VerticalSpread(fields);
  setup.legs.forEach((leg) => {
    leg.parentId = setup._id.toString();
  });
  await setup.save();
  return toJSON(setup);
};

const findSetup = async (setupId) => {
  if (!mongoose.isValidObjectId(setupId)) {
    throw new NotFoundError(`No se encontró el setup "${setupId}".`);
  }
  const setup = await VerticalSpread.findOne({ _id: setupId, active: true, deletedAt: null });
  if (!setup) throw new NotFoundError(`No se encontró el setup "${setupId}".`);
  return setup;
};

const getSetupsService = async (filters) => {
  const query = {};
  if (filters.symbol || filters.underlyingTicker) {
    query.underlyingTicker = String(filters.underlyingTicker || filters.symbol).trim().toUpperCase();
  }
  if (filters.strategyType) query.strategyType = toStrategyCode(filters.strategyType);
  if (filters.status) {
    if (!['active', 'archived'].includes(String(filters.status).toLowerCase())) {
      throw new ValidationError('status debe ser "active" o "archived".');
    }
    const isActive = String(filters.status).toLowerCase() === 'active';
    query.active = isActive;
    query.deletedAt = isActive ? null : { $ne: null };
  } else if (filters.active === undefined || String(filters.active) === 'true') {
    query.active = true;
    query.deletedAt = null;
  } else {
    query.active = false;
    query.deletedAt = { $ne: null };
  }
  if (filters.userId) query.userId = filters.userId;
  if (filters.active !== undefined) {
    if (!['true', 'false'].includes(String(filters.active))) {
      throw new ValidationError('active debe ser true o false.');
    }
    query.active = String(filters.active) === 'true';
    query.deletedAt = query.active ? null : { $ne: null };
  }

  const limit = filters.limit === undefined ? 20 : Number(filters.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ValidationError('limit debe ser un entero entre 1 y 100.');
  }
  if (filters.cursor) {
    if (!mongoose.isValidObjectId(filters.cursor)) {
      throw new ValidationError('cursor debe ser un ID válido.');
    }
    query._id = { $lt: filters.cursor };
  }

  const results = await VerticalSpread.find(query).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = results.length > limit;
  const items = results.slice(0, limit).map(toJSON);
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
};

const getSetupService = async (setupId) => toJSON(await findSetup(setupId));

const updateSetupService = async (setupId, changes, { replace = false } = {}) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new ValidationError('El body debe ser un objeto JSON.');
  }
  const allowedFields = [
    'key',
    'label',
    'description',
    'underlyingTicker',
    'currentStockPrice',
    'strategyType',
    'symbol',
    'underlyingPrice',
    'expiration',
    'sigmaMultiplier',
    'calculatedSigmaValue',
    'legs',
    'assumptions',
    'notes',
    'active',
    'createdBy',
    'updatedBy',
    'userId',
  ];
  const unexpected = Object.keys(changes).filter((field) => !allowedFields.includes(field));
  if (unexpected.length) {
    throw new ValidationError(`Campos no permitidos para PATCH: ${unexpected.join(', ')}.`);
  }
  if (replace) {
    const requiredFields = ['strategyType', 'legs'];
    const missingFields = requiredFields.filter((field) => changes[field] === undefined);
    if (changes.underlyingTicker === undefined && changes.symbol === undefined) {
      missingFields.push('underlyingTicker');
    }
    if (changes.currentStockPrice === undefined && changes.underlyingPrice === undefined) {
      missingFields.push('currentStockPrice');
    }
    for (const field of ['sigmaMultiplier', 'calculatedSigmaValue']) {
      if (changes[field] === undefined) missingFields.push(field);
    }
    if (missingFields.length) {
      throw new ValidationError(`PUT requiere los campos: ${missingFields.join(', ')}.`);
    }
  }

  const setup = await findSetup(setupId);
  const candidate = { ...toStrategyInput(setup), ...changes };
  if (Object.hasOwn(changes, 'underlyingTicker') && !Object.hasOwn(changes, 'symbol')) {
    candidate.symbol = changes.underlyingTicker;
  }
  if (Object.hasOwn(changes, 'currentStockPrice') && !Object.hasOwn(changes, 'underlyingPrice')) {
    candidate.underlyingPrice = changes.currentStockPrice;
  }
  const { fields } = toSpreadFields(candidate, setup.toObject());
  fields.lastEvaluation = null;
  Object.assign(setup, fields);
  setup.legs.forEach((leg) => {
    leg.parentId = setup._id.toString();
  });
  await setup.save();
  return toJSON(setup);
};

const replaceSetupService = async (setupId, data) => updateSetupService(setupId, data, { replace: true });

const deleteSetupService = async (setupId) => {
  const setup = await findSetup(setupId);
  setup.active = false;
  setup.deletedAt = new Date();
  await setup.save();
};

const runBatchService = async (items, operation) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('El body debe incluir un arreglo no vacío.');
  }
  if (items.length > 100) throw new ValidationError('Cada lote admite hasta 100 elementos.');

  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    try {
      results.push({ index, success: true, ...(await operation(items[index])) });
    } catch (error) {
      if (error.status === undefined && error.name !== 'ValidationError' && error.name !== 'CastError') {
        throw error;
      }
      results.push({
        index,
        setupId: items[index]?.setupId,
        success: false,
        error: error.message,
      });
    }
  }
  return { atomic: false, results };
};

const createSetupsBatchService = async (setups) => runBatchService(setups, async (setup) => ({
  setup: await createSetupService(setup),
}));

const updateSetupsBatchService = async (operations) => runBatchService(operations, async (operation) => {
  if (!operation?.setupId) throw new ValidationError('Cada operación requiere setupId.');
  return {
    setupId: operation.setupId,
    setup: await updateSetupService(operation.setupId, operation.changes),
  };
});

const deleteSetupsBatchService = async (setupIds) => runBatchService(setupIds, async (setupId) => {
  if (typeof setupId !== 'string') throw new ValidationError('Cada setupId debe ser texto.');
  await deleteSetupService(setupId);
  return { setupId };
});

const getLegsService = async (setupId) => (await findSetup(setupId)).legs;

const getLegService = async (setupId, legId) => {
  const setup = await findSetup(setupId);
  const leg = setup.legs.find((item) => item.id === legId);
  if (!leg) throw new NotFoundError(`No se encontró la pata "${legId}".`);
  return leg;
};

const updateLegsAndSave = async (setup, legs) => {
  const candidate = { ...toStrategyInput(setup), legs };
  const { fields } = toSpreadFields(candidate, setup.toObject());
  fields.lastEvaluation = null;
  Object.assign(setup, fields);
  setup.legs.forEach((leg) => {
    leg.parentId = setup._id.toString();
  });
  await setup.save();
  return toJSON(setup);
};

const createLegService = async (setupId, leg) => {
  if (!leg || typeof leg !== 'object' || Array.isArray(leg)) {
    throw new ValidationError('La pata debe ser un objeto.');
  }
  const setup = await findSetup(setupId);
  const normalized = { ...leg, expiration: leg.expiration || setup.expiration };
  return updateLegsAndSave(setup, [...setup.legs.map((item) => item.toObject()), normalized]);
};

const updateLegService = async (setupId, legId, changes) => {
  const setup = await findSetup(setupId);
  const legs = setup.legs.map((leg) => (leg.id === legId
    ? {
      ...leg.toObject(),
      ...changes,
      ...(changes.type === undefined ? {} : { optionType: changes.type }),
      ...(changes.side === undefined ? {} : { action: changes.side }),
      ...(changes.expiration === undefined ? {} : { expirationDate: changes.expiration }),
      id: leg.id,
    }
    : leg.toObject()));
  if (!setup.legs.some((leg) => leg.id === legId)) {
    throw new NotFoundError(`No se encontró la pata "${legId}".`);
  }
  return updateLegsAndSave(setup, legs);
};

const replaceLegService = async (setupId, legId, replacement) => {
  if (!replacement || typeof replacement !== 'object' || Array.isArray(replacement)) {
    throw new ValidationError('El body debe ser un objeto JSON.');
  }
  const requiredFields = ['strike'];
  const missingFields = requiredFields.filter((field) => replacement[field] === undefined);
  if (replacement.type === undefined && replacement.optionType === undefined) missingFields.push('optionType');
  if (replacement.side === undefined && replacement.action === undefined) missingFields.push('action');
  if (replacement.expiration === undefined && replacement.expirationDate === undefined) {
    missingFields.push('expirationDate');
  }
  const quote = replacement.action === 'buy' || replacement.side === 'buy'
    ? replacement.ask
    : replacement.bid;
  if (replacement.price === undefined && replacement.premium === undefined && quote === undefined) {
    missingFields.push(replacement.action === 'buy' || replacement.side === 'buy' ? 'ask' : 'bid');
  }
  if (missingFields.length) {
    throw new ValidationError(`PUT requiere los campos: ${missingFields.join(', ')}.`);
  }
  return updateLegService(setupId, legId, replacement);
};

const replaceLegsService = async (setupId, legs) => {
  if (!Array.isArray(legs)) throw new ValidationError('legs debe ser un arreglo.');
  const setup = await findSetup(setupId);
  return updateLegsAndSave(setup, legs.map((leg) => ({
    ...leg,
    expiration: leg.expiration || setup.expiration,
  })));
};

const updateLegsBatchService = async (setupId, operations) => {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new ValidationError('operations debe ser un arreglo no vacío.');
  }
  const setup = await findSetup(setupId);
  const legs = setup.legs.map((leg) => leg.toObject());
  const errors = [];

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const legIndex = legs.findIndex((leg) => leg.id === operation?.legId);
    if (legIndex < 0) {
      errors.push({ index, legId: operation?.legId, error: 'No se encontró la pata.' });
    } else if (operation.action !== 'update' || !operation.changes || typeof operation.changes !== 'object') {
      errors.push({ index, legId: operation.legId, error: 'La operación debe usar action "update" y changes.' });
    } else {
      const { type, side, expiration, ...changes } = operation.changes;
      legs[legIndex] = {
        ...legs[legIndex],
        ...changes,
        ...(type === undefined ? {} : { optionType: type }),
        ...(side === undefined ? {} : { action: side }),
        ...(expiration === undefined ? {} : { expirationDate: expiration }),
        id: legs[legIndex].id,
      };
    }
  }

  if (errors.length) return { updated: false, results: errors };
  const updated = await updateLegsAndSave(setup, legs);
  return {
    updated: true,
    setup: updated,
    results: operations.map(({ legId }, index) => ({ index, legId, success: true })),
  };
};

const deleteLegsService = async (setupId, legIds) => {
  if (!Array.isArray(legIds) || legIds.length === 0 || legIds.some((id) => typeof id !== 'string')) {
    throw new ValidationError('legIds debe ser un arreglo no vacío de IDs.');
  }
  const setup = await findSetup(setupId);
  const ids = new Set(legIds);
  const legs = setup.legs.filter((leg) => !ids.has(leg.id)).map((leg) => leg.toObject());
  if (legs.length === setup.legs.length) throw new NotFoundError('No se encontró ninguna de las patas indicadas.');
  return updateLegsAndSave(setup, legs);
};

const saveEvaluationService = async (input) => {
  const evaluation = evaluateVertical(input);
  if (input.setupId) {
    const setup = await findSetup(input.setupId);
    if (setup.strategyType !== toStrategyCode(evaluation.strategyType)) {
      throw new ValidationError('strategyType no coincide con el setup solicitado.');
    }
    setup.lastEvaluation = evaluation;
    await setup.save();
  }
  return evaluation;
};

const buildStrategyService = (input) => buildVertical(input);

module.exports = {
  NotFoundError,
  toSpreadFields,
  buildStrategyService,
  createLegService,
  createSetupService,
  createSetupsBatchService,
  deleteLegsService,
  deleteSetupService,
  deleteSetupsBatchService,
  getLegService,
  getLegsService,
  getSetupService,
  getSetupsService,
  getTypeByNameService,
  getTypesService,
  replaceLegsService,
  replaceLegService,
  replaceSetupService,
  saveEvaluationService,
  updateLegService,
  updateLegsBatchService,
  updateSetupService,
  updateSetupsBatchService,
};
