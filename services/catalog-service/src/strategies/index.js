const { blackScholesPrice, buildPnlMatrix } = require('../quant');

const strategyTypeCatalog = [
  {
    code: 'BULL_CALL',
    label: 'Bull Call',
    alias: 'BC',
    description: 'Spread alcista con compra de call y venta de call de mayor strike.',
    direction: 'bullish',
    premiumDirection: 'debit',
    legs: {
      long: { optionType: 'call', role: 'buy' },
      short: { optionType: 'call', role: 'sell' },
    },
  },
  {
    code: 'BULL_PUT',
    label: 'Bull Put',
    alias: 'BP',
    description: 'Spread alcista con venta de put y compra de put de menor strike.',
    direction: 'bullish',
    premiumDirection: 'credit',
    legs: {
      long: { optionType: 'put', role: 'buy' },
      short: { optionType: 'put', role: 'sell' },
    },
  },
  {
    code: 'BEAR_CALL',
    label: 'Bear Call',
    alias: 'BCall',
    description: 'Spread bajista con venta de call y compra de call de mayor strike.',
    direction: 'bearish',
    premiumDirection: 'credit',
    legs: {
      long: { optionType: 'call', role: 'buy' },
      short: { optionType: 'call', role: 'sell' },
    },
  },
  {
    code: 'BEAR_PUT',
    label: 'Bear Put',
    alias: 'BPut',
    description: 'Spread bajista con compra de put y venta de put de menor strike.',
    direction: 'bearish',
    premiumDirection: 'debit',
    legs: {
      long: { optionType: 'put', role: 'buy' },
      short: { optionType: 'put', role: 'sell' },
    },
  },
];

function getStrategyTypeByCode(code) {
  return strategyTypeCatalog.find((item) => item.code === String(code).toUpperCase()) || null;
}

function isSupportedStrategyType(code) {
  return Boolean(getStrategyTypeByCode(code));
}

function buildStrategyTemplate(strategyType, params = {}) {
  const type = getStrategyTypeByCode(strategyType);
  if (!type) {
    throw new Error(`Unsupported strategy type: ${strategyType}`);
  }

  const {
    symbol,
    underlyingPrice,
    longStrike,
    shortStrike,
    longQty = 1,
    shortQty = 1,
    expiration,
    notes = '',
  } = params;

  const direction = type.direction;
  const longLeg = {
    optionType: type.legs.long.optionType,
    strike: Number(longStrike ?? underlyingPrice ?? 0),
    quantity: Number(longQty),
    side: type.legs.long.role,
  };

  const shortLeg = {
    optionType: type.legs.short.optionType,
    strike: Number(shortStrike ?? longStrike ?? underlyingPrice ?? 0),
    quantity: Number(shortQty),
    side: type.legs.short.role,
  };

  return {
    strategyType: type.code,
    label: type.label,
    direction,
    premiumDirection: type.premiumDirection,
    symbol: String(symbol || '').toUpperCase(),
    underlyingPrice: Number(underlyingPrice ?? 0),
    expiration: expiration || null,
    longLeg,
    shortLeg,
    notes,
  };
}

function evaluateStrategySetup(params = {}) {
  const {
    strategyType,
    symbol,
    underlyingPrice,
    longStrike,
    shortStrike,
    longQty = 1,
    shortQty = 1,
    expiration,
    rate = 0.05,
    volatility = 0.2,
    timeToMaturity = 0.5,
  } = params;

  if (!isSupportedStrategyType(strategyType)) {
    throw new Error(`Unsupported strategy type: ${strategyType}`);
  }

  const template = buildStrategyTemplate(strategyType, {
    symbol,
    underlyingPrice,
    longStrike,
    shortStrike,
    longQty,
    shortQty,
    expiration,
  });

  const longOption = blackScholesPrice({
    spot: Number(underlyingPrice),
    strike: Number(template.longLeg.strike),
    rate: Number(rate),
    volatility: Number(volatility),
    timeToMaturity: Number(timeToMaturity),
    optionType: template.longLeg.optionType,
  });

  const shortOption = blackScholesPrice({
    spot: Number(underlyingPrice),
    strike: Number(template.shortLeg.strike),
    rate: Number(rate),
    volatility: Number(volatility),
    timeToMaturity: Number(timeToMaturity),
    optionType: template.shortLeg.optionType,
  });

  const longQtyN = Number(longQty) || 1;
  const shortQtyN = Number(shortQty) || 1;
  const netPremium = template.strategyType === 'BULL_CALL' || template.strategyType === 'BEAR_PUT'
    ? (longOption - shortOption)
    : (shortOption - longOption);

  let maxProfit;
  let maxLoss;
  let breakEven;

  if (template.strategyType === 'BULL_CALL') {
    maxProfit = ((template.shortLeg.strike - template.longLeg.strike) - netPremium) * 100 * longQtyN;
    maxLoss = netPremium * 100 * longQtyN;
    breakEven = template.longLeg.strike + netPremium;
  }

  if (template.strategyType === 'BULL_PUT') {
    const spreadWidth = template.shortLeg.strike - template.longLeg.strike;
    maxProfit = (shortOption - longOption) * 100 * longQtyN;
    maxLoss = (spreadWidth - (shortOption - longOption)) * 100 * longQtyN;
    breakEven = template.shortLeg.strike - (shortOption - longOption);
  }

  if (template.strategyType === 'BEAR_CALL') {
    const spreadWidth = template.longLeg.strike - template.shortLeg.strike;
    maxProfit = (shortOption - longOption) * 100 * longQtyN;
    maxLoss = (spreadWidth - (shortOption - longOption)) * 100 * longQtyN;
    breakEven = template.shortLeg.strike + (shortOption - longOption);
  }

  if (template.strategyType === 'BEAR_PUT') {
    maxProfit = ((template.longLeg.strike - template.shortLeg.strike) - netPremium) * 100 * longQtyN;
    maxLoss = netPremium * 100 * longQtyN;
    breakEven = template.longLeg.strike - netPremium;
  }

  const matrix = buildPnlMatrix({
    spot: Number(underlyingPrice),
    strike: Number(template.longLeg.strike),
    premium: Math.max(0, netPremium),
    optionType: template.longLeg.optionType,
    scenarios: [-0.2, -0.1, 0, 0.1, 0.2],
    volatilityShift: 0,
    rate: Number(rate),
    timeToMaturity: Number(timeToMaturity),
  });

  return {
    ...template,
    longOption: {
      optionType: template.longLeg.optionType,
      strike: template.longLeg.strike,
      quantity: template.longLeg.quantity,
      price: longOption,
    },
    shortOption: {
      optionType: template.shortLeg.optionType,
      strike: template.shortLeg.strike,
      quantity: template.shortLeg.quantity,
      price: shortOption,
    },
    netPremium,
    maxProfit,
    maxLoss,
    breakEven,
    scenarioMatrix: matrix,
  };
}

module.exports = {
  strategyTypeCatalog,
  getStrategyTypeByCode,
  isSupportedStrategyType,
  buildStrategyTemplate,
  evaluateStrategySetup,
};
