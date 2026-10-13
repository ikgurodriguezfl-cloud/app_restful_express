const crypto = require('crypto');

const VERTICAL_STRATEGIES = Object.freeze({
  BULL_CALL_SPREAD: {
    name: 'Bull Call Spread',
    optionType: 'call',
    lowerStrikeSide: 'buy',
    higherStrikeSide: 'sell',
    premiumType: 'debit',
    description: 'Spread alcista de débito con opciones call.',
  },
  BULL_PUT_SPREAD: {
    name: 'Bull Put Spread',
    optionType: 'put',
    lowerStrikeSide: 'buy',
    higherStrikeSide: 'sell',
    premiumType: 'credit',
    description: 'Spread alcista de crédito con opciones put.',
  },
  BEAR_CALL_SPREAD: {
    name: 'Bear Call Spread',
    optionType: 'call',
    lowerStrikeSide: 'sell',
    higherStrikeSide: 'buy',
    premiumType: 'credit',
    description: 'Spread bajista de crédito con opciones call.',
  },
  BEAR_PUT_SPREAD: {
    name: 'Bear Put Spread',
    optionType: 'put',
    lowerStrikeSide: 'sell',
    higherStrikeSide: 'buy',
    premiumType: 'debit',
    description: 'Spread bajista de débito con opciones put.',
  },
});

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 422;
  }
}

const normalizeStrategyType = (strategyType) => String(strategyType || '')
  .trim()
  .toUpperCase()
  .replace(/[ -]+/g, '_')
  .replace(/^(BULL|BEAR)_(CALL|PUT)$/, '$1_$2_SPREAD');

const strategyDefinition = (strategyType) => {
  const normalizedType = normalizeStrategyType(strategyType);
  const definition = VERTICAL_STRATEGIES[normalizedType];
  if (!definition) {
    throw new ValidationError(`Tipo de estrategia vertical no soportado: "${strategyType}".`);
  }
  return { strategyType: normalizedType, ...definition };
};

const normalizeExpiration = (expiration) => {
  if (!expiration) return undefined;
  const value = expiration instanceof Date ? expiration.toISOString().slice(0, 10) : String(expiration);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new ValidationError('Cada vencimiento debe usar el formato YYYY-MM-DD.');
  }
  if (new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Cada vencimiento debe ser una fecha válida en formato YYYY-MM-DD.');
  }
  return value;
};

const normalizeLeg = (leg, setup) => {
  if (!leg || typeof leg !== 'object' || Array.isArray(leg)) {
    throw new ValidationError('Cada pata debe ser un objeto.');
  }

  const normalized = {
    id: leg.id || crypto.randomUUID(),
    parentId: leg.parentId,
    symbol: String(leg.symbol || leg.underlyingTicker || setup.symbol || '').trim().toUpperCase(),
    contractSymbol: String(leg.contractSymbol || '').trim().toUpperCase(),
    type: String(leg.optionType || leg.type || '').trim().toLowerCase(),
    side: String(leg.action || leg.side || '').trim().toLowerCase(),
    strike: Number(leg.strike),
    quantity: Number(leg.quantity === undefined ? 1 : leg.quantity),
    expiration: normalizeExpiration(leg.expirationDate || leg.expiration || setup.expiration),
    bid: leg.bid === undefined || leg.bid === null ? null : Number(leg.bid),
    ask: leg.ask === undefined || leg.ask === null ? null : Number(leg.ask),
    impliedVolatility: leg.impliedVolatility === undefined || leg.impliedVolatility === null
      ? null : Number(leg.impliedVolatility),
    delta: leg.delta === undefined || leg.delta === null ? null : Number(leg.delta),
    gamma: leg.gamma === undefined || leg.gamma === null ? null : Number(leg.gamma),
    theta: leg.theta === undefined || leg.theta === null ? null : Number(leg.theta),
    vega: leg.vega === undefined || leg.vega === null ? null : Number(leg.vega),
    active: leg.active === undefined ? true : Boolean(leg.active),
    deletedAt: leg.deletedAt || null,
  };

  const hasMarketQuotes = normalized.bid !== null || normalized.ask !== null;
  const marketPrice = leg.price === undefined ? leg.premium : leg.price;
  if (hasMarketQuotes) {
    const quotePrice = normalized.side === 'buy' ? normalized.ask : normalized.bid;
    if (quotePrice !== null) normalized.price = quotePrice;
  } else if (marketPrice !== undefined) {
    normalized.price = Number(marketPrice);
  }
  if (leg.multiplier !== undefined) normalized.multiplier = Number(leg.multiplier);

  return normalized;
};

const validateVertical = (input, { requirePrices = true } = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('El setup debe ser un objeto.');
  }

  const { strategyType, ...definition } = strategyDefinition(input.strategyType);
  const symbol = String(input.symbol || input.underlyingTicker || '').trim().toUpperCase();
  if (!symbol) throw new ValidationError('symbol o underlyingTicker es obligatorio.');

  const expiration = normalizeExpiration(input.expiration || input.expirationDate);
  const legs = (input.legs || []).map((leg) => normalizeLeg(leg, { symbol, expiration }));
  if (legs.length !== 2) {
    throw new ValidationError('Un spread vertical debe contener exactamente dos patas.');
  }

  for (const leg of legs) {
    if (!leg.symbol) throw new ValidationError('symbol es obligatorio en el setup o en cada pata.');
    if (leg.symbol !== symbol) throw new ValidationError('Ambas patas deben compartir el subyacente del setup.');
    if (leg.type !== definition.optionType) {
      throw new ValidationError(`${strategyType} requiere dos opciones ${definition.optionType}.`);
    }
    if (!['buy', 'sell'].includes(leg.side)) {
      throw new ValidationError('side debe ser "buy" o "sell".');
    }
    if (!Number.isFinite(leg.strike) || leg.strike <= 0) {
      throw new ValidationError('strike debe ser un número mayor que cero.');
    }
    if (!Number.isInteger(leg.quantity) || leg.quantity <= 0) {
      throw new ValidationError('quantity debe ser un entero mayor que cero.');
    }
    if (!leg.expiration) throw new ValidationError('expiration es obligatorio en el setup o en cada pata.');
    if (expiration && leg.expiration !== expiration) {
      throw new ValidationError('Ambas patas deben compartir el vencimiento del setup.');
    }
    if (requirePrices && (!Number.isFinite(leg.price) || leg.price < 0)) {
      throw new ValidationError('Cada pata requiere price o bid/ask para calcular el débito/crédito.');
    }
    if (leg.price !== undefined && (!Number.isFinite(leg.price) || leg.price < 0)) {
      throw new ValidationError('price debe ser un número mayor o igual a cero.');
    }
    if (leg.multiplier !== undefined && (!Number.isFinite(leg.multiplier) || leg.multiplier <= 0)) {
      throw new ValidationError('multiplier debe ser un número mayor que cero.');
    }
    for (const field of ['bid', 'ask', 'impliedVolatility', 'delta', 'gamma', 'theta', 'vega']) {
      if (leg[field] !== null && !Number.isFinite(leg[field])) {
        throw new ValidationError(`${field} debe ser numérico o null.`);
      }
    }
    if (leg.bid !== null && leg.bid < 0) throw new ValidationError('bid no puede ser negativo.');
    if (leg.ask !== null && leg.ask < 0) throw new ValidationError('ask no puede ser negativo.');
    if (leg.impliedVolatility !== null && leg.impliedVolatility < 0) {
      throw new ValidationError('impliedVolatility no puede ser negativo.');
    }
  }

  const [lowerLeg, higherLeg] = [...legs].sort((a, b) => a.strike - b.strike);
  if (lowerLeg.strike === higherLeg.strike) {
    throw new ValidationError('Los strikes del spread deben ser distintos.');
  }
  if (lowerLeg.quantity !== higherLeg.quantity) {
    throw new ValidationError('Las cantidades de ambas patas deben mantener una proporción 1:1.');
  }
  if (lowerLeg.side !== definition.lowerStrikeSide || higherLeg.side !== definition.higherStrikeSide) {
    throw new ValidationError(
      `${strategyType} requiere ${definition.lowerStrikeSide} en el strike menor y ${definition.higherStrikeSide} en el mayor.`,
    );
  }

  if (requirePrices) {
    const netCashPerShare = legs.reduce(
      (total, leg) => total + (leg.side === 'sell' ? leg.price : -leg.price),
      0,
    );
    if (definition.premiumType === 'debit' && netCashPerShare >= 0) {
      throw new ValidationError(`${strategyType} debe generar un débito neto.`);
    }
    if (definition.premiumType === 'credit' && netCashPerShare <= 0) {
      throw new ValidationError(`${strategyType} debe generar un crédito neto.`);
    }
    if (definition.premiumType === 'debit' && -netCashPerShare >= higherLeg.strike - lowerLeg.strike) {
      throw new ValidationError('El débito neto debe ser menor que el ancho del spread.');
    }
    if (definition.premiumType === 'credit' && netCashPerShare >= higherLeg.strike - lowerLeg.strike) {
      throw new ValidationError('El crédito neto debe ser menor que el ancho del spread.');
    }
  }

  return {
    ...input,
    strategyType: normalizeStrategyType(strategyType),
    symbol,
    expiration: expiration || legs[0].expiration,
    legs,
  };
};

const buildVertical = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('El body debe ser un objeto JSON.');
  }
  const { strategyType, ...definition } = strategyDefinition(input.strategyType);
  const symbol = String(input.symbol || input.underlyingTicker || '').trim().toUpperCase();
  if (!symbol) throw new ValidationError('symbol o underlyingTicker es obligatorio.');

  const strikes = input.strikes;
  if (!Array.isArray(strikes) || strikes.length !== 2) {
    throw new ValidationError('strikes debe contener exactamente dos valores.');
  }
  const strikeEntries = strikes
    .map((strike, index) => ({ strike: Number(strike), index }))
    .sort((a, b) => a.strike - b.strike);
  if (strikeEntries.some(({ strike }) => !Number.isFinite(strike) || strike <= 0)
    || strikeEntries[0].strike === strikeEntries[1].strike) {
    throw new ValidationError('strikes debe contener dos números positivos y distintos.');
  }

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('quantity debe ser un entero mayor que cero.');
  }
  const expiration = normalizeExpiration(input.expiration || input.expirationDate);
  if (!expiration) throw new ValidationError('expiration es obligatorio.');

  const premiums = input.premiums;
  if (premiums !== undefined
    && (!Array.isArray(premiums) || premiums.length !== 2
      || premiums.some((premium) => !Number.isFinite(Number(premium)) || Number(premium) < 0))) {
    throw new ValidationError('premiums debe contener dos números mayores o iguales a cero, en el mismo orden que strikes.');
  }

  const legs = strikeEntries.map(({ strike, index }, sortedIndex) => ({
    id: crypto.randomUUID(),
    symbol,
    type: definition.optionType,
    side: sortedIndex === 0 ? definition.lowerStrikeSide : definition.higherStrikeSide,
    strike,
    quantity,
    expiration,
    ...(premiums ? { price: Number(premiums[index]) } : {}),
  }));

  const template = {
    strategyType,
    symbol,
    underlyingPrice: input.underlyingPrice === undefined ? undefined : Number(input.underlyingPrice),
    expiration,
    legs,
    assumptions: input.assumptions || {},
  };
  if (template.underlyingPrice !== undefined
    && (!Number.isFinite(template.underlyingPrice) || template.underlyingPrice <= 0)) {
    throw new ValidationError('underlyingPrice debe ser un número mayor que cero.');
  }
  if (premiums) validateVertical(template);

  return {
    ...template,
    pendingFields: premiums ? [] : ['legs[].price'],
  };
};

const evaluateVertical = (input) => {
  const setup = validateVertical(input);
  const definition = VERTICAL_STRATEGIES[setup.strategyType];
  const [lowerLeg, higherLeg] = [...setup.legs].sort((a, b) => a.strike - b.strike);
  const legMultipliers = [lowerLeg.multiplier, higherLeg.multiplier]
    .filter((value) => value !== undefined);
  if (new Set(legMultipliers).size > 1) {
    throw new ValidationError('Ambas patas deben compartir el multiplier.');
  }
  const multiplier = Number(
    input.multiplier
      || input.assumptions?.multiplier
      || legMultipliers[0]
      || 100,
  );
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new ValidationError('multiplier debe ser un número mayor que cero.');
  }

  const netCashPerShare = setup.legs.reduce(
    (total, leg) => total + (leg.side === 'sell' ? leg.price : -leg.price),
    0,
  );
  const netAmount = Math.abs(netCashPerShare);
  const spreadWidth = higherLeg.strike - lowerLeg.strike;
  const quantity = lowerLeg.quantity;
  const maxRisk = (definition.premiumType === 'debit' ? netAmount : spreadWidth - netAmount)
    * quantity * multiplier;
  const maxBenefit = (definition.premiumType === 'debit' ? spreadWidth - netAmount : netAmount)
    * quantity * multiplier;

  const breakEven = definition.optionType === 'call'
    ? lowerLeg.strike + netAmount
    : higherLeg.strike - netAmount;

  return {
    strategyType: setup.strategyType,
    strategyCode: setup.strategyType
      .replace(/_SPREAD$/, '')
      .toLowerCase(),
    symbol: setup.symbol,
    underlyingTicker: setup.symbol,
    expiration: setup.expiration,
    spreadWidth,
    width: spreadWidth,
    quantity,
    multiplier,
    netDebit: definition.premiumType === 'debit' ? netAmount * quantity * multiplier : 0,
    netCredit: definition.premiumType === 'credit' ? netAmount * quantity * multiplier : 0,
    spreadCategory: definition.premiumType,
    netDebitOrCredit: definition.premiumType === 'debit'
      ? -netAmount * quantity * multiplier
      : netAmount * quantity * multiplier,
    maxRisk,
    maxBenefit,
    maxLoss: maxRisk,
    maxProfit: maxBenefit,
    breakEven,
    breakEvenPrice: breakEven,
    riskRewardRatio: maxRisk === 0 ? 0 : maxBenefit / maxRisk,
    currentStockPrice: Number(input.currentStockPrice || input.underlyingPrice || 0),
    sigmaMultiplier: input.sigmaMultiplier === undefined ? null : Number(input.sigmaMultiplier),
    calculatedSigmaValue: input.calculatedSigmaValue === undefined
      ? null : Number(input.calculatedSigmaValue),
    assumptions: input.assumptions || {},
    evaluatedAt: new Date().toISOString(),
  };
};

module.exports = {
  VERTICAL_STRATEGIES,
  ValidationError,
  buildVertical,
  evaluateVertical,
  normalizeExpiration,
  normalizeStrategyType,
  strategyDefinition,
  validateVertical,
};
