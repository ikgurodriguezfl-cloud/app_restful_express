const strategyCatalog = [
  {
    code: 'LONG_CALL',
    name: 'Long Call',
    expectedLegs: 1,
    phase: 'F1',
    description: 'Posición direccional alcista con exposición larga a la opción.',
  },
  {
    code: 'BULL_CALL_SPREAD',
    name: 'Bull Call Spread',
    expectedLegs: 2,
    phase: 'F3',
    description: 'Spread vertical alcista con riesgo limitado y beneficio acotado.',
  },
  {
    code: 'IRON_CONDOR',
    name: 'Iron Condor',
    expectedLegs: 4,
    phase: 'F4',
    description: 'Estrategia neutral con cuatro patas y rangos definidos de riesgo.',
  },
];

const getStrategyTypes = (_request, response) => {
  response.status(200).json({
    phase: 'F0-F4',
    strategies: strategyCatalog,
  });
};

const getStrategyType = (request, response) => {
  const { strategyType } = request.params;
  const result = strategyCatalog.find((item) => item.code === strategyType.toUpperCase());

  if (!result) {
    return response.status(404).json({ message: `Tipo de estrategia no encontrado: ${strategyType}` });
  }

  return response.status(200).json(result);
};

const buildStrategyTemplate = (request, response) => {
  const { strategyType, symbol, underlyingPrice, expiration, strike, quantity = 1, premium = 0 } = request.body || {};

  response.status(200).json({
    strategyType: strategyType || 'LONG_CALL',
    symbol: symbol || 'AAPL',
    underlyingPrice: Number(underlyingPrice || 0),
    expiration: expiration || '2026-12-18',
    strike: Number(strike || 0),
    quantity: Number(quantity),
    premium: Number(premium),
    legs: [{
      legId: 'leg-1',
      type: 'option',
      side: 'long',
      quantity: Number(quantity),
      strike: Number(strike || 0),
      expiration,
      premium: Number(premium),
    }],
    status: 'draft',
    validation: {
      complete: Boolean(symbol && expiration),
      missingFields: [],
    },
  });
};

const evaluateStrategy = (request, response) => {
  const { strategyType = 'LONG_CALL', underlyingPrice = 0, premium = 0, quantity = 1, legs = [] } = request.body || {};

  const netPremium = Number((premium || 0) * quantity);
  const maxProfit = Number((underlyingPrice || 0) * quantity * 0.1);
  const maxLoss = Number(Math.max((netPremium || 0), 1));
  const breakEven = Number((underlyingPrice || 0) + (premium || 0));

  response.status(200).json({
    strategyType,
    symbol: request.body?.symbol || 'AAPL',
    netPremium,
    breakEven,
    maxProfit,
    maxLoss,
    greeks: {
      delta: 0.5,
      gamma: 0.012,
      theta: -0.03,
      vega: 0.2,
      rho: 0.12,
    },
    legs: legs.length ? legs : [{
      legId: 'leg-1',
      type: 'option',
      side: 'long',
      quantity,
      premium,
    }],
    assumptions: {
      underlyingPrice,
      quantity,
      model: 'black-scholes',
    },
    evaluatedAt: new Date().toISOString(),
  });
};

const getSetups = (_request, response) => {
  response.status(200).json({
    setups: [],
    total: 0,
    message: 'Base de setups lista para integrar el modelo de persistencia del servicio.',
  });
};

const createSetup = (request, response) => {
  const body = request.body || {};

  response.status(201).json({
    setupId: `setup-${Date.now()}`,
    strategyType: body.strategyType || 'LONG_CALL',
    symbol: body.symbol || 'AAPL',
    status: 'draft',
    createdAt: new Date().toISOString(),
    data: body,
  });
};

module.exports = {
  getStrategyTypes,
  getStrategyType,
  buildStrategyTemplate,
  evaluateStrategy,
  getSetups,
  createSetup,
};
