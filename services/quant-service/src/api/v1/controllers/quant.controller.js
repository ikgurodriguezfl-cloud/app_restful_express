const { blackScholesGreeks, blackScholesPrice, getTimeToMaturity } = require('../../../services/option-pricing');

const normalizePriceRequest = (body) => {
  const timeToMaturity = body.timeToMaturity ?? (body.expiration ? getTimeToMaturity(body.expiration) : 0.25);

  return {
    model: body.model || 'black-scholes',
    symbol: body.symbol || 'UNKNOWN',
    spot: Number(body.spot),
    strike: Number(body.strike),
    expiration: body.expiration || null,
    rate: Number(body.rate || 0),
    dividendYield: Number(body.dividendYield || 0),
    volatility: Number(body.volatility),
    optionType: body.optionType || 'call',
    steps: Number(body.steps || 100),
    timeToMaturity,
  };
};

const getPrices = (request, response) => {
  try {
    const payload = normalizePriceRequest(request.body || {});

    const price = blackScholesPrice(payload);
    const greeks = blackScholesGreeks(payload);

    response.status(200).json({
      model: payload.model,
      currency: 'USD',
      symbol: payload.symbol,
      price: Number(price.toFixed(4)),
      greeks,
      assumptions: {
        spot: payload.spot,
        strike: payload.strike,
        rate: payload.rate,
        dividendYield: payload.dividendYield,
        volatility: payload.volatility,
        timeToMaturityYears: Number(payload.timeToMaturity.toFixed(6)),
      },
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.status(400).json({
      message: 'No se pudo calcular el precio de la opción.',
      detail: error.message,
    });
  }
};

const getGreeks = (request, response) => {
  try {
    const payload = normalizePriceRequest(request.body || {});
    const greeks = blackScholesGreeks(payload);

    response.status(200).json({
      model: payload.model,
      symbol: payload.symbol,
      greeks,
      assumptions: {
        spot: payload.spot,
        strike: payload.strike,
        rate: payload.rate,
        dividendYield: payload.dividendYield,
        volatility: payload.volatility,
        timeToMaturityYears: Number(payload.timeToMaturity.toFixed(6)),
      },
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    response.status(400).json({
      message: 'No se pudo calcular las griegas.',
      detail: error.message,
    });
  }
};

const getImpliedVolatility = (request, response) => {
  const { marketPrice, initialGuess = 0.2, tolerance = 1e-8, maxIterations = 200 } = request.body || {};

  if (marketPrice === undefined) {
    return response.status(400).json({
      message: 'Se requiere marketPrice para resolver la volatilidad implícita.',
    });
  }

  let volatility = Number(initialGuess);
  const payload = normalizePriceRequest(request.body || {});

  let converged = false;
  let iterations = 0;

  for (iterations = 0; iterations < maxIterations; iterations += 1) {
    const modelPrice = blackScholesPrice({ ...payload, volatility });
    const pricingError = modelPrice - Number(marketPrice);

    if (Math.abs(pricingError) <= tolerance) {
      converged = true;
      break;
    }

    const derivative = blackScholesGreeks({ ...payload, volatility }).vega;
    if (Math.abs(derivative) < Number.EPSILON) {
      break;
    }

    volatility -= pricingError / derivative;
    if (volatility <= 0) {
      volatility = 0.0001;
    }
  }

  const modelPrice = blackScholesPrice({ ...payload, volatility });

  response.status(converged ? 200 : 422).json({
    impliedVolatility: Number(volatility.toFixed(8)),
    converged,
    iterations,
    method: 'newton-raphson',
    modelPrice: Number(modelPrice.toFixed(6)),
    pricingError: Number((modelPrice - Number(marketPrice)).toFixed(8)),
    assumptions: {
      spot: payload.spot,
      strike: payload.strike,
      rate: payload.rate,
      dividendYield: payload.dividendYield,
      timeToMaturityYears: Number(payload.timeToMaturity.toFixed(6)),
      optionType: payload.optionType,
    },
    calculatedAt: new Date().toISOString(),
  });
};

module.exports = {
  getPrices,
  getGreeks,
  getImpliedVolatility,
};
