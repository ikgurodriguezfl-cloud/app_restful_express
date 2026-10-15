const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateVerticalSpread } = require('../src/services/vertical-spread');

const cases = [
  ['BULL_CALL_SPREAD', 'call', 'buy', 'sell', 500, 500, 105],
  ['BULL_PUT_SPREAD', 'put', 'buy', 'sell', 500, 500, 105],
  ['BEAR_CALL_SPREAD', 'call', 'sell', 'buy', 500, 500, 105],
  ['BEAR_PUT_SPREAD', 'put', 'sell', 'buy', 500, 500, 105],
];

for (const [strategyType, type, lowerSide, higherSide, maxLoss, maxProfit, breakEven] of cases) {
  test(`calcula ${strategyType} con primas mockeadas`, () => {
    const result = evaluateVerticalSpread({
      strategyType,
      symbol: 'AAPL',
      expiration: '2026-12-18',
      legs: [
        {
          type,
          side: lowerSide,
          strike: 100,
          price: ['BULL_PUT_SPREAD', 'BEAR_PUT_SPREAD'].includes(strategyType)
            ? (strategyType === 'BULL_PUT_SPREAD' ? 2 : 2)
            : (lowerSide === 'buy' ? 8 : 7),
        },
        {
          type,
          side: higherSide,
          strike: 110,
          price: strategyType === 'BULL_PUT_SPREAD'
            ? 7
            : (strategyType === 'BEAR_PUT_SPREAD' ? 7 : (higherSide === 'sell' ? 3 : 2)),
        },
      ],
    });

    assert.equal(result.maxLoss, maxLoss);
    assert.equal(result.maxProfit, maxProfit);
    assert.equal(result.breakEven, breakEven);
  });
}

test('usa ask para comprar y bid para vender cuando recibe cotizaciones reales', () => {
  const result = evaluateVerticalSpread({
    strategyType: 'BULL_CALL_SPREAD',
    legs: [
      { type: 'call', side: 'buy', strike: 100, bid: 7.9, ask: 8 },
      { type: 'call', side: 'sell', strike: 110, bid: 3, ask: 3.1 },
    ],
  });

  assert.equal(result.netDebit, 500);
  assert.equal(result.maxProfit, 500);
});
