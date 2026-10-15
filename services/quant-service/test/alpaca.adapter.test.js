const test = require('node:test');
const assert = require('node:assert/strict');
const AlpacaAdapter = require('../src/brokers/alpaca/alpaca.adapter');

const createResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

test('normaliza la cuenta de Alpaca sin exponer credenciales', async () => {
  const adapter = new AlpacaAdapter({
    keyId: 'key',
    secretKey: 'secret',
    tradingBaseUrl: 'https://paper.example/',
    dataBaseUrl: 'https://data.example/',
    fetchImplementation: async (url, options) => {
      assert.equal(url, 'https://paper.example/v2/account');
      assert.equal(options.headers['APCA-API-KEY-ID'], 'key');
      assert.equal(options.headers['APCA-API-SECRET-KEY'], 'secret');
      return createResponse({
        id: 'account-id',
        status: 'ACTIVE',
        currency: 'USD',
        buying_power: '10000',
        cash: '10000',
        trading_blocked: false,
      });
    },
  });

  assert.deepEqual(await adapter.getAccount(), {
    provider: 'alpaca',
    id: 'account-id',
    status: 'ACTIVE',
    currency: 'USD',
    buyingPower: '10000',
    cash: '10000',
    tradingBlocked: false,
  });
});

test('normaliza la última cotización de Alpaca', async () => {
  const adapter = new AlpacaAdapter({
    keyId: 'key',
    secretKey: 'secret',
    tradingBaseUrl: 'https://paper.example',
    dataBaseUrl: 'https://data.example',
    fetchImplementation: async (url) => {
      assert.equal(url, 'https://data.example/v2/stocks/AAPL/quotes/latest');
      return createResponse({ quote: { bp: 100, ap: 101, bs: 2, as: 3, t: 'timestamp' } });
    },
  });

  assert.deepEqual(await adapter.getQuote('aapl'), {
    provider: 'alpaca',
    symbol: 'AAPL',
    bid: 100,
    ask: 101,
    bidSize: 2,
    askSize: 3,
    timestamp: 'timestamp',
  });
});

test('obtiene contratos y cotizaciones reales de una cadena de opciones', async () => {
  const requests = [];
  const adapter = new AlpacaAdapter({
    keyId: 'key',
    secretKey: 'secret',
    tradingBaseUrl: 'https://paper.example',
    dataBaseUrl: 'https://data.example',
    fetchImplementation: async (url) => {
      requests.push(url);
      if (url.startsWith('https://paper.example/v2/options/contracts?')) {
        return createResponse({
          option_contracts: [{
            symbol: 'AAPL261218C00100000',
            underlying_symbol: 'AAPL',
            type: 'call',
            strike_price: '100',
            expiration_date: '2026-12-18',
            size: '100',
            status: 'active',
          }],
        });
      }
      assert.match(url, /^https:\/\/data\.example\/v1beta1\/options\/quotes\/latest\?/);
      return createResponse({
        quotes: {
          AAPL261218C00100000: { bp: 8, ap: 8.2, bs: 10, as: 12, t: 'timestamp' },
        },
      });
    },
  });

  const result = await adapter.getOptionChain({
    symbol: 'aapl',
    expiration: '2026-12-18',
  });

  assert.equal(requests.length, 2);
  assert.equal(result.contracts[0].contractSymbol, 'AAPL261218C00100000');
  assert.equal(result.contracts[0].bid, 8);
  assert.equal(result.contracts[0].ask, 8.2);
  assert.equal(result.contracts[0].multiplier, 100);
});
