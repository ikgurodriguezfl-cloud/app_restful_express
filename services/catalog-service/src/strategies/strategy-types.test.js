const test = require('node:test');
const assert = require('node:assert/strict');

const {
  strategyTypeCatalog,
  getStrategyTypeByCode,
  buildStrategyTemplate,
  isSupportedStrategyType,
  evaluateStrategySetup,
} = require('./index');

test('strategy catalog exposes the four supported option strategies', () => {
  assert.equal(strategyTypeCatalog.length, 4);
  assert.deepEqual(
    strategyTypeCatalog.map((item) => item.code),
    ['BULL_CALL', 'BULL_PUT', 'BEAR_CALL', 'BEAR_PUT'],
  );
});

test('strategy metadata is returned by code', () => {
  const item = getStrategyTypeByCode('BULL_CALL');
  assert.ok(item);
  assert.equal(item.direction, 'bullish');
  assert.equal(item.legs.long.optionType, 'call');
});

test('supported strategy guard validates known values', () => {
  assert.equal(isSupportedStrategyType('BEAR_PUT'), true);
  assert.equal(isSupportedStrategyType('UNKNOWN_TYPE'), false);
});

test('buildStrategyTemplate creates a valid spread setup', () => {
  const setup = buildStrategyTemplate('BULL_CALL', {
    symbol: 'AAPL',
    underlyingPrice: 220,
    longStrike: 220,
    shortStrike: 225,
    longQty: 1,
    shortQty: 1,
    expiration: '2026-10-18',
  });

  assert.equal(setup.strategyType, 'BULL_CALL');
  assert.equal(setup.symbol, 'AAPL');
  assert.equal(setup.longLeg.optionType, 'call');
  assert.equal(setup.shortLeg.optionType, 'call');
  assert.equal(setup.direction, 'bullish');
});

test('evaluateStrategySetup computes risk and payoff metrics for a bullish call spread', () => {
  const result = evaluateStrategySetup({
    strategyType: 'BULL_CALL',
    symbol: 'AAPL',
    underlyingPrice: 220,
    longStrike: 220,
    shortStrike: 225,
    longQty: 1,
    shortQty: 1,
    expiration: '2026-10-18',
    rate: 0.05,
    volatility: 0.2,
    timeToMaturity: 0.5,
  });

  assert.equal(result.strategyType, 'BULL_CALL');
  assert.ok(Number.isFinite(result.maxProfit));
  assert.ok(Number.isFinite(result.maxLoss));
  assert.ok(Number.isFinite(result.breakEven));
  assert.ok(result.longOption.price > 0);
  assert.ok(result.shortOption.price > 0);
});
