const DEFINITIONS = Object.freeze({
  BULL_CALL_SPREAD: { optionType: 'call', lowerSide: 'buy', higherSide: 'sell', premiumType: 'debit' },
  BULL_PUT_SPREAD: { optionType: 'put', lowerSide: 'buy', higherSide: 'sell', premiumType: 'credit' },
  BEAR_CALL_SPREAD: { optionType: 'call', lowerSide: 'sell', higherSide: 'buy', premiumType: 'credit' },
  BEAR_PUT_SPREAD: { optionType: 'put', lowerSide: 'sell', higherSide: 'buy', premiumType: 'debit' },
});

const normalizeStrategyType = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[ -]+/g, '_')
  .replace(/^(BULL|BEAR)_(CALL|PUT)$/, '$1_$2_SPREAD');

const evaluateVerticalSpread = (input) => {
  const strategyType = normalizeStrategyType(input.strategyType);
  const definition = DEFINITIONS[strategyType];
  if (!definition) throw new Error('strategyType debe ser bull_call, bull_put, bear_call o bear_put.');

  const symbol = String(input.symbol || 'AAPL').trim().toUpperCase();
  const expiration = String(input.expiration || '2026-12-18');
  const quantity = Number(input.quantity || input.legs?.[0]?.quantity || 1);
  const multiplier = Number(input.multiplier || 100);
  const legs = Array.isArray(input.legs) ? input.legs : [];

  if (legs.length !== 2) throw new Error('legs debe contener exactamente dos patas.');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity debe ser un entero mayor que cero.');
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error('multiplier debe ser mayor que cero.');

  const normalizedLegs = legs.map((leg) => {
    const side = String(leg.side || leg.action || '').toLowerCase();
    const price = leg.price ?? leg.premium ?? (side === 'buy' ? leg.ask : leg.bid);
    return {
      ...leg,
      type: String(leg.type || leg.optionType || '').toLowerCase(),
      side,
      strike: Number(leg.strike),
      price: Number(price),
    };
  }).sort((a, b) => a.strike - b.strike);

  const [lower, higher] = normalizedLegs;
  if (normalizedLegs.some((leg) => (
    leg.type !== definition.optionType
    || !['buy', 'sell'].includes(leg.side)
    || !Number.isFinite(leg.strike)
    || leg.strike <= 0
    || !Number.isFinite(leg.price)
    || leg.price < 0
  ))) {
    throw new Error('Cada pata requiere type, side, strike y price válidos.');
  }
  if (lower.strike === higher.strike
    || lower.side !== definition.lowerSide
    || higher.side !== definition.higherSide) {
    throw new Error('Las patas no corresponden al tipo de spread seleccionado.');
  }

  const width = higher.strike - lower.strike;
  const netCashPerShare = normalizedLegs.reduce(
    (total, leg) => total + (leg.side === 'sell' ? leg.price : -leg.price),
    0,
  );
  const netAmount = Math.abs(netCashPerShare);
  if (definition.premiumType === 'debit' && (netCashPerShare >= 0 || netAmount >= width)) {
    throw new Error('El débito neto debe ser positivo y menor que el ancho del spread.');
  }
  if (definition.premiumType === 'credit' && (netCashPerShare <= 0 || netAmount >= width)) {
    throw new Error('El crédito neto debe ser positivo y menor que el ancho del spread.');
  }

  const maxRisk = (definition.premiumType === 'debit' ? netAmount : width - netAmount)
    * quantity * multiplier;
  const maxProfit = (definition.premiumType === 'debit' ? width - netAmount : netAmount)
    * quantity * multiplier;
  const breakEven = definition.optionType === 'call'
    ? lower.strike + netAmount
    : higher.strike - netAmount;

  return {
    strategyType,
    symbol,
    expiration,
    spreadCategory: definition.premiumType,
    legs: normalizedLegs,
    width,
    quantity,
    multiplier,
    netDebit: definition.premiumType === 'debit' ? netAmount * quantity * multiplier : 0,
    netCredit: definition.premiumType === 'credit' ? netAmount * quantity * multiplier : 0,
    maxLoss: maxRisk,
    maxProfit,
    breakEven,
    riskRewardRatio: maxRisk === 0 ? 0 : maxProfit / maxRisk,
    evaluatedAt: new Date().toISOString(),
  };
};

module.exports = { DEFINITIONS, evaluateVerticalSpread, normalizeStrategyType };
