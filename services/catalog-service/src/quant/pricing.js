function standardNormalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const erfApprox = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2));

  return 0.5 * (1 + sign * erfApprox);
}

function blackScholesPrice({ spot, strike, rate, volatility, timeToMaturity, optionType = 'call' }) {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || !Number.isFinite(rate) || !Number.isFinite(volatility) || !Number.isFinite(timeToMaturity)) {
    throw new Error('All pricing inputs must be finite numbers.');
  }

  if (spot <= 0 || strike <= 0 || volatility <= 0 || timeToMaturity <= 0) {
    throw new Error('spot, strike, volatility and timeToMaturity must be greater than zero.');
  }

  const sqrtT = Math.sqrt(timeToMaturity);
  const d1 = (Math.log(spot / strike) + (rate + (volatility ** 2) / 2) * timeToMaturity) / (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;
  const discountedStrike = strike * Math.exp(-rate * timeToMaturity);

  const callPrice = spot * standardNormalCDF(d1) - discountedStrike * standardNormalCDF(d2);
  const putPrice = discountedStrike * standardNormalCDF(-d2) - spot * standardNormalCDF(-d1);

  return optionType === 'put' ? putPrice : callPrice;
}

function binomialPrice({
  spot,
  strike,
  rate,
  volatility,
  timeToMaturity,
  optionType = 'call',
  steps = 100,
}) {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || !Number.isFinite(rate) || !Number.isFinite(volatility) || !Number.isFinite(timeToMaturity)) {
    throw new Error('All pricing inputs must be finite numbers.');
  }

  const n = Math.max(1, Number(steps) || 1);
  const dt = timeToMaturity / n;
  const u = Math.exp(volatility * Math.sqrt(dt));
  const d = 1 / u;
  const riskNeutralP = (Math.exp(rate * dt) - d) / (u - d);
  const discount = Math.exp(-rate * dt);

  const values = Array(n + 1).fill(0);
  for (let i = 0; i <= n; i += 1) {
    const terminal = spot * (u ** i) * (d ** (n - i));
    values[i] = optionType === 'put'
      ? Math.max(strike - terminal, 0)
      : Math.max(terminal - strike, 0);
  }

  for (let step = n - 1; step >= 0; step -= 1) {
    for (let i = 0; i <= step; i += 1) {
      const future = values[i + 1] * riskNeutralP + values[i] * (1 - riskNeutralP);
      values[i] = discount * future;
    }
  }

  return values[0];
}

function computeGreeks({ spot, strike, rate, volatility, timeToMaturity, optionType = 'call' }) {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || !Number.isFinite(rate) || !Number.isFinite(volatility) || !Number.isFinite(timeToMaturity)) {
    throw new Error('All Greeks inputs must be finite numbers.');
  }

  if (spot <= 0 || strike <= 0 || volatility <= 0 || timeToMaturity <= 0) {
    throw new Error('spot, strike, volatility and timeToMaturity must be greater than zero.');
  }

  const sqrtT = Math.sqrt(timeToMaturity);
  const d1 = (Math.log(spot / strike) + (rate + (volatility ** 2) / 2) * timeToMaturity) / (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;
  const nd1 = standardNormalCDF(d1);
  const nd2 = standardNormalCDF(d2);
  const nd1Neg = standardNormalCDF(-d1);
  const nd2Neg = standardNormalCDF(-d2);
  const discountedStrike = strike * Math.exp(-rate * timeToMaturity);

  const deltaCall = nd1;
  const deltaPut = nd1 - 1;

  const pdf = Math.exp(-(d1 ** 2) / 2) / Math.sqrt(2 * Math.PI);
  const gamma = pdf / (spot * volatility * sqrtT);
  const thetaCall = -(spot * pdf * volatility) / (2 * sqrtT) - rate * discountedStrike * nd2 + rate * spot * nd1;
  const thetaPut = -(spot * pdf * volatility) / (2 * sqrtT) + rate * discountedStrike * nd2Neg - rate * spot * nd1Neg;
  const vega = spot * pdf * sqrtT;
  const rhoCall = discountedStrike * timeToMaturity * nd2;
  const rhoPut = -discountedStrike * timeToMaturity * nd2Neg;

  const delta = optionType === 'put' ? deltaPut : deltaCall;
  const theta = optionType === 'put' ? thetaPut : thetaCall;

  return {
    delta,
    gamma,
    theta,
    vega,
    rho: optionType === 'put' ? rhoPut : rhoCall,
    d1,
    d2,
    model: 'black-scholes',
  };
}

function impliedVolatilityNewtonRaphson({
  spot,
  strike,
  rate,
  marketPrice,
  timeToMaturity,
  optionType = 'call',
  initialGuess = 0.2,
  tolerance = 1e-8,
  maxIterations = 200,
}) {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || !Number.isFinite(rate) || !Number.isFinite(marketPrice) || !Number.isFinite(timeToMaturity)) {
    throw new Error('All IV inputs must be finite numbers.');
  }

  if (spot <= 0 || strike <= 0 || timeToMaturity <= 0 || marketPrice <= 0) {
    throw new Error('spot, strike, timeToMaturity and marketPrice must be greater than zero.');
  }

  let sigma = Number(initialGuess);
  if (!(sigma > 0)) sigma = 0.2;

  for (let i = 0; i < maxIterations; i += 1) {
    const price = blackScholesPrice({
      spot,
      strike,
      rate,
      volatility: sigma,
      timeToMaturity,
      optionType,
    });

    const priceDerivative = (() => {
      const sqrtT = Math.sqrt(timeToMaturity);
      const d1 = (Math.log(spot / strike) + (rate + (sigma ** 2) / 2) * timeToMaturity) / (sigma * sqrtT);
      const pdf = Math.exp(-(d1 ** 2) / 2) / Math.sqrt(2 * Math.PI);
      return spot * pdf * sqrtT;
    })();

    const diff = price - marketPrice;
    if (Math.abs(diff) <= tolerance) {
      return {
        impliedVolatility: sigma,
        iterations: i + 1,
        converged: true,
      };
    }

    const correction = diff / priceDerivative;
    sigma -= correction;

    if (!Number.isFinite(sigma) || sigma <= 0) {
      sigma = Math.max(1e-6, Math.abs(sigma) || 0.2);
    }
  }

  return {
    impliedVolatility: sigma,
    iterations: maxIterations,
    converged: false,
  };
}

function normalizeOptionChainRecord(record = {}) {
  if (!record || typeof record !== 'object') {
    throw new Error('Chain record must be an object.');
  }

  const symbol = String(record.symbol || record.ticker || '').trim().toUpperCase();
  const expiration = record.expiration || record.expiry || record.date || null;
  const strike = Number(record.strike ?? record.strikePrice ?? 0);
  const optionType = String(record.optionType || record.type || 'call').trim().toLowerCase();

  if (!symbol) {
    throw new Error('Chain record is missing a symbol.');
  }

  return {
    symbol,
    expiration,
    strike,
    optionType: optionType === 'put' ? 'put' : 'call',
    bid: Number(record.bid ?? 0),
    ask: Number(record.ask ?? 0),
    last: Number(record.last ?? record.close ?? 0),
    volume: Number(record.volume ?? 0),
    openInterest: Number(record.openInterest ?? record.open_interest ?? 0),
    impliedVolatility: Number(record.impliedVolatility ?? record.iv ?? 0),
    provider: String(record.provider || 'unknown').trim(),
    timestamp: record.timestamp || new Date().toISOString(),
  };
}

function buildPnlMatrix({
  spot,
  optionType = 'call',
  strike,
  premium,
  scenarios = [-0.2, -0.1, 0, 0.1, 0.2],
  volatilityShift = 0,
  rate = 0.01,
  timeToMaturity = 0.5,
}) {
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || !Number.isFinite(premium)) {
    throw new Error('spot, strike and premium must be finite numbers.');
  }

  return scenarios.map((scenario) => {
    const futureSpot = spot * (1 + scenario);
    const optionPrice = blackScholesPrice({
      spot: futureSpot,
      strike,
      rate,
      volatility: Math.max(0.01, 0.2 + volatilityShift),
      timeToMaturity: Math.max(0.01, timeToMaturity),
      optionType,
    });

    const pnl = (optionType === 'call' ? optionPrice - premium : premium - optionPrice) * 100;

    return {
      scenario,
      futureSpot,
      optionPrice,
      pnl,
      priceChangePct: scenario,
      volatilityShift,
    };
  });
}

module.exports = {
  standardNormalCDF,
  blackScholesPrice,
  binomialPrice,
  computeGreeks,
  impliedVolatilityNewtonRaphson,
  normalizeOptionChainRecord,
  buildPnlMatrix,
};
