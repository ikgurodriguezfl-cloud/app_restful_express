const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildVertical,
  evaluateVertical,
  validateVertical,
} = require('../src/domain/verticals');
const VerticalSpread = require('../src/api/v1/models/vertical-spread.model');
const { toSpreadFields } = require('../src/api/v1/services/strategies.service');

const bullCall = {
  strategyType: 'BULL_CALL_SPREAD',
  symbol: 'AAPL',
  expiration: '2027-01-15',
  legs: [
    {
      type: 'call',
      side: 'buy',
      strike: 100,
      quantity: 1,
      price: 8,
    },
    {
      type: 'call',
      side: 'sell',
      strike: 110,
      quantity: 1,
      price: 3,
    },
  ],
};

test('validates and evaluates a debit vertical with bounded risk and reward', () => {
  const validated = validateVertical(bullCall);
  assert.equal(validated.symbol, 'AAPL');

  const result = evaluateVertical(bullCall);
  assert.equal(result.spreadWidth, 10);
  assert.equal(result.netDebit, 500);
  assert.equal(result.netCredit, 0);
  assert.equal(result.maxRisk, 500);
  assert.equal(result.maxBenefit, 500);
  assert.equal(result.breakEven, 105);
});

test('calculates credit spread metrics', () => {
  const result = evaluateVertical({
    ...bullCall,
    strategyType: 'BULL_PUT_SPREAD',
    legs: [
      { ...bullCall.legs[0], type: 'put', price: 2 },
      { ...bullCall.legs[1], type: 'put', price: 7 },
    ],
  });

  assert.equal(result.netCredit, 500);
  assert.equal(result.maxRisk, 500);
  assert.equal(result.maxBenefit, 500);
  assert.equal(result.breakEven, 105);
});

test('builds a normalized two-leg template and reports missing premiums', () => {
  const result = buildVertical({
    strategyType: 'bear-put-spread',
    symbol: 'aapl',
    expiration: '2027-01-15',
    strikes: [110, 100],
    quantity: 2,
  });

  assert.equal(result.strategyType, 'BEAR_PUT_SPREAD');
  assert.deepEqual(result.legs.map(({ strike, side }) => ({ strike, side })), [
    { strike: 100, side: 'sell' },
    { strike: 110, side: 'buy' },
  ]);
  assert.deepEqual(result.pendingFields, ['legs[].price']);
});

test('keeps premiums associated with their strikes when build input is unordered', () => {
  const result = buildVertical({
    strategyType: 'BULL_CALL_SPREAD',
    symbol: 'AAPL',
    expiration: '2027-01-15',
    strikes: [110, 100],
    premiums: [3, 8],
    quantity: 1,
  });

  assert.deepEqual(result.legs.map(({ strike, price }) => ({ strike, price })), [
    { strike: 100, price: 8 },
    { strike: 110, price: 3 },
  ]);
});

test('rejects mismatched expirations, wrong sides, and unbalanced quantities', () => {
  assert.throws(
    () => validateVertical({
      ...bullCall,
      legs: [bullCall.legs[0], { ...bullCall.legs[1], expiration: '2027-02-19' }],
    }),
    /vencimiento/,
  );
  assert.throws(
    () => validateVertical({
      ...bullCall,
      legs: [bullCall.legs[0], { ...bullCall.legs[1], side: 'buy' }],
    }),
    /requiere/,
  );
  assert.throws(
    () => validateVertical({
      ...bullCall,
      legs: [bullCall.legs[0], { ...bullCall.legs[1], quantity: 2 }],
    }),
    /proporción 1:1/,
  );
});

test('rejects a debit/credit inconsistent with the strategy type', () => {
  assert.throws(
    () => evaluateVertical({
      ...bullCall,
      legs: [
        { ...bullCall.legs[0], price: 2 },
        { ...bullCall.legs[1], price: 8 },
      ],
    }),
    /débito neto/,
  );
});

test('accepts the documented names for a VerticalSpread and its option legs', () => {
  const result = evaluateVertical({
    strategyType: 'bull_call',
    underlyingTicker: 'AAPL',
    expiration: '2027-01-15',
    currentStockPrice: 105,
    legs: [
      {
        contractSymbol: 'AAPL270115C00100000',
        optionType: 'call',
        action: 'buy',
        strike: 100,
        expirationDate: '2027-01-15',
        ask: 8,
        quantity: 1,
      },
      {
        contractSymbol: 'AAPL270115C00110000',
        optionType: 'call',
        action: 'sell',
        strike: 110,
        expirationDate: '2027-01-15',
        bid: 3,
        quantity: 1,
      },
    ],
  });

  assert.equal(result.strategyCode, 'bull_call');
  assert.equal(result.width, 10);
  assert.equal(result.netDebitOrCredit, -500);
  assert.equal(result.breakEvenPrice, 105);
});

test('validates the documented VerticalSpread and embedded option-leg model', async () => {
  const spread = new VerticalSpread({
    key: 'bull_call_aapl_2027_01_15_100_110',
    label: 'Bull Call Spread AAPL',
    underlyingTicker: 'AAPL',
    currentStockPrice: 105,
    strategyType: 'bull_call',
    spreadCategory: 'debit',
    width: 10,
    netDebitOrCredit: -500,
    maxProfit: 500,
    maxLoss: 500,
    riskRewardRatio: 1,
    breakEvenPrice: 105,
    sigmaMultiplier: 1,
    calculatedSigmaValue: 5,
    legs: [
      {
        parentId: 'parent-id',
        contractSymbol: 'AAPL270115C00100000',
        optionType: 'call',
        action: 'buy',
        strike: 100,
        expirationDate: '2027-01-15',
        ask: 8,
        quantity: 1,
      },
      {
        parentId: 'parent-id',
        contractSymbol: 'AAPL270115C00110000',
        optionType: 'call',
        action: 'sell',
        strike: 110,
        expirationDate: '2027-01-15',
        bid: 3,
        quantity: 1,
      },
    ],
  });

  await spread.validate();
  const output = spread.toJSON();
  assert.equal(output.id, spread._id.toString());
  assert.equal(output.legs[0].parentId, 'parent-id');
  assert.ok(output.legs[0].id);
  assert.equal(output.legs[0]._id, undefined);
});

test('maps a canonical create request into a valid persisted VerticalSpread', async () => {
  const { fields } = toSpreadFields({
    strategyType: 'bull_call',
    underlyingTicker: 'AAPL',
    currentStockPrice: 105,
    sigmaMultiplier: 1,
    calculatedSigmaValue: 5,
    expiration: '2027-01-15',
    legs: [
      {
        optionType: 'call',
        action: 'buy',
        strike: 100,
        expirationDate: '2027-01-15',
        ask: 8,
      },
      {
        optionType: 'call',
        action: 'sell',
        strike: 110,
        expirationDate: '2027-01-15',
        bid: 3,
      },
    ],
  });
  const spread = new VerticalSpread(fields);
  spread.legs.forEach((leg) => {
    leg.parentId = spread._id.toString();
  });
  await spread.validate();

  assert.equal(spread.collection.collectionName, 'vertical_spreads');
  assert.equal(spread.strategyType, 'bull_call');
  assert.equal(spread.netDebitOrCredit, -500);
  assert.equal(spread.legs[0].contractSymbol, 'AAPL270115C00100000');
  assert.equal(spread.legs[1].contractSymbol, 'AAPL270115C00110000');
});
