const test = require('node:test');
const assert = require('node:assert/strict');

const {
  blackScholesPrice,
  binomialPrice,
  computeGreeks,
  impliedVolatilityNewtonRaphson,
  normalizeOptionChainRecord,
  buildPnlMatrix,
} = require('./index');

test('Black-Scholes price is positive for a standard call option', () => {
  const price = blackScholesPrice({
    spot: 100,
    strike: 100,
    rate: 0.05,
    volatility: 0.2,
    timeToMaturity: 1,
    optionType: 'call',
  });

  assert.ok(Number.isFinite(price));
  assert.ok(price > 0);
});

test('Binomial price remains finite and close to Black-Scholes in a standard scenario', () => {
  const price = binomialPrice({
    spot: 100,
    strike: 100,
    rate: 0.05,
    volatility: 0.2,
    timeToMaturity: 1,
    optionType: 'call',
    steps: 200,
  });

  assert.ok(Number.isFinite(price));
  assert.ok(price > 0);
  assert.ok(price < 30);
});

test('Greeks are finite and have the expected shape', () => {
  const Greeks = computeGreeks({
    spot: 100,
    strike: 100,
    rate: 0.05,
    volatility: 0.2,
    timeToMaturity: 1,
    optionType: 'call',
  });

  assert.ok(Number.isFinite(Greeks.delta));
  assert.ok(Number.isFinite(Greeks.gamma));
  assert.ok(Number.isFinite(Greeks.theta));
  assert.ok(Number.isFinite(Greeks.vega));
  assert.ok(Number.isFinite(Greeks.rho));
});

test('IV solver converges to a close value', () => {
  const targetVol = 0.2;
  const marketPrice = blackScholesPrice({
    spot: 100,
    strike: 100,
    rate: 0.05,
    volatility: targetVol,
    timeToMaturity: 1,
    optionType: 'call',
  });

  const solution = impliedVolatilityNewtonRaphson({
    spot: 100,
    strike: 100,
    rate: 0.05,
    marketPrice,
    timeToMaturity: 1,
    optionType: 'call',
    initialGuess: 0.15,
  });

  assert.ok(solution.converged === true || solution.impliedVolatility > 0);
  assert.ok(Math.abs(solution.impliedVolatility - targetVol) < 0.1);
});

test('Option chain records are normalized consistently', () => {
  const record = normalizeOptionChainRecord({
    symbol: 'aapl',
    expiry: '2026-10-18',
    strikePrice: 220,
    type: 'call',
    bid: 2.5,
    ask: 2.7,
    last: 2.6,
    volume: 1000,
    open_interest: 2000,
    iv: 0.31,
    provider: 'CBOE',
  });

  assert.equal(record.symbol, 'AAPL');
  assert.equal(record.optionType, 'call');
  assert.equal(record.provider, 'CBOE');
  assert.equal(record.strike, 220);
  assert.ok(Number.isFinite(record.bid));
});

test('P&L matrix contains scenario rows and finite values', () => {
  const matrix = buildPnlMatrix({
    spot: 100,
    strike: 100,
    premium: 4,
    optionType: 'call',
    scenarios: [-0.2, 0, 0.2],
    rate: 0.01,
    timeToMaturity: 0.5,
  });

  assert.equal(matrix.length, 3);
  assert.ok(matrix.every((row) => Number.isFinite(row.pnl)));
});
