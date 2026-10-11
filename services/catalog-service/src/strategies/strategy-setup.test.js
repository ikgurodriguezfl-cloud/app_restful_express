const test = require('node:test');
const assert = require('node:assert/strict');

const StrategySetup = require('./strategy-setup.model');

const validSetup = {
  strategyType: 'BULL_CALL',
  symbol: 'AAPL',
  underlyingPrice: 220,
  expiration: '2026-10-18',
  longLeg: {
    optionType: 'call',
    strike: 220,
    quantity: 1,
    side: 'buy',
    price: 18.07,
  },
  shortLeg: {
    optionType: 'call',
    strike: 225,
    quantity: 1,
    side: 'sell',
    price: 17.24,
  },
  assumptions: {
    rate: 0.05,
    volatility: 0.2,
    timeToMaturity: 0.5,
  },
  evaluation: {
    netPremium: 0.83,
    maxProfit: 417,
    maxLoss: 83,
    breakEven: 220.83,
    scenarioMatrix: [],
  },
};

test('strategy setup schema accepts a fully evaluated spread', async () => {
  const setup = new StrategySetup(validSetup);
  await assert.doesNotReject(() => setup.validate());
  assert.equal(setup.symbol, 'AAPL');
  assert.equal(setup.longLeg.side, 'buy');
  assert.equal(setup.evaluation.breakEven, 220.83);
});

test('strategy setup schema rejects unsupported strategy types', async () => {
  const setup = new StrategySetup({ ...validSetup, strategyType: 'IRON_CONDOR' });
  await assert.rejects(() => setup.validate(), /is not a valid enum value/);
});
