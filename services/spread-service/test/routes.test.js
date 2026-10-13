'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/spread.service');
const Model = require('../src/models/vertical-spread.model');
const app = require('../src/app');
const input = require('../src/services/spread-input');
const spreadId = '507f1f77bcf86cd799439011';
const legId = '5b2bd39b-cd46-4db8-9ac8-aad9f308d561';
const leg = { contractSymbol: 'AAPL261218C00190000', optionType: 'call', action: 'buy', strike: 190, expirationDate: '2026-12-18' };
const data = { key: 'test_spread', label: 'Test', underlyingTicker: 'AAPL', currentStockPrice: 190,
  strategyType: 'bull_call', spreadCategory: 'debit', width: 5, netDebitOrCredit: -2,
  maxProfit: 300, maxLoss: 200, riskRewardRatio: 1.5, breakEvenPrice: 192,
  sigmaMultiplier: 1, calculatedSigmaValue: 5, legs: [] };
let server;
after(() => server?.close());

test('Las 18 rutas despachan al servicio esperado sin acceder a MongoDB', async t => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/spreads`;
  const cases = [
    ['GET', '', 'findAll'], ['POST', '', 'create', data, 201], ['GET', `/${spreadId}`, 'findById'],
    ['PATCH', `/${spreadId}`, 'updateById', { label: 'New' }], ['PUT', `/${spreadId}`, 'replaceById', data],
    ['DELETE', `/${spreadId}`, 'softDeleteById'],
    ['POST', '/batch', 'runBatch', { spreads: [data] }, 201],
    ['PATCH', '/batch', 'runBatch', { operations: [{ spreadId, changes: { label: 'New' } }] }],
    ['DELETE', '/batch', 'runBatch', { spreadIds: [spreadId] }],
    ['GET', `/${spreadId}/legs`, 'getLegs'], ['GET', `/${spreadId}/legs/${legId}`, 'getLeg'],
    ['POST', `/${spreadId}/legs`, 'setLegs', [leg, { ...leg, action: 'sell', strike: 195 }], 201],
    ['PUT', `/${spreadId}/legs`, 'setLegs', { legs: [leg, leg] }],
    ['PATCH', `/${spreadId}/legs`, 'changeLegs', { operations: [{ legId, changes: { bid: 2 } }] }],
    ['DELETE', `/${spreadId}/legs`, 'changeLegs', { legIds: [legId] }],
    ['PATCH', `/${spreadId}/legs/${legId}`, 'changeLegs', { bid: 2 }],
    ['PUT', `/${spreadId}/legs/${legId}`, 'changeLegs', leg],
    ['DELETE', `/${spreadId}/legs/${legId}`, 'changeLegs'],
  ];
  for (const [method, path, name, body, status = 200] of cases) {
    await t.test(`${method} ${path || '/'}`, async t => {
      let called = false;
      t.mock.method(service, name, async (...args) => { called = true; assert.ok(args.length); return { marker: name }; });
      const response = await fetch(url + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(response.status, status);
      const result = await response.json();
      assert.equal(result.marker || result.spread?.marker, name);
      assert.equal(called, true);
    });
  }
  await t.test('Errores de entrada, 404 y JSON inválido', async () => {
    for (const [method, path, body, expected] of [
      ['PATCH', '/bad', { label: 'x' }, 400],
      ['PATCH', `/${spreadId}`, { _id: 'forged' }, 400],
      ['GET', '?limit=1.5', undefined, 400],
      ['GET', '?sort=no-json', undefined, 400],
      ['GET', `/${spreadId}/legs/bad`, undefined, 400],
      ['GET', '/unknown/path/here', undefined, 404],
    ]) {
      const res = await fetch(url + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(res.status, expected);
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(res.status, 400);
  });
});

test('Lotes permiten éxito parcial y no ocultan fallos del servidor', async () => {
  const result = await service.runBatch([1, 2], async value => { if (value === 2) input.fail('invalid'); return { value }; });
  assert.equal(result.atomic, false);
  assert.deepEqual(result.results.map(item => item.success), [true, false]);
  await assert.rejects(service.runBatch([], () => {}), { status: 400 });
  await assert.rejects(service.runBatch(Array(101).fill(1), () => {}), { status: 400 });
  await assert.rejects(service.runBatch([1], () => { throw new Error('database down'); }), /database down/);
});

test('PUT requiere campos completos, conserva identidad y elimina opcionales omitidos', async t => {
  const document = new Model({ ...data, _id: spreadId, description: 'old', legs: [{ ...leg, id: legId, parentId: spreadId, bid: 3 }, { ...leg, action: 'sell', strike: 195, parentId: spreadId }] });
  t.mock.method(Model, 'findOne', async () => document);
  let saves = 0;
  t.mock.method(document, 'save', async () => { await document.validate(); saves++; return document; });
  await assert.rejects(service.replaceById(spreadId, { label: 'only' }), { status: 400 });
  await service.changeLegs(spreadId, [{ legId, changes: leg }], { replace: true });
  assert.equal(document.legs[0].id, legId);
  assert.equal(document.legs[0].parentId, spreadId);
  assert.equal(document.legs[0].bid, null);
  assert.equal(saves, 1);
  const { key, ...replacement } = data;
  await service.replaceById(spreadId, replacement);
  assert.equal(document.key, key);
  assert.equal(document.description, undefined);
  assert.equal(saves, 2);
});

test('Cambios de patas fallidos no guardan; borrado lógico conserva dos patas', async t => {
  const document = new Model({ ...data, _id: spreadId, legs: [{ ...leg, id: legId, parentId: spreadId }, { ...leg, action: 'sell', strike: 195, parentId: spreadId }] });
  t.mock.method(Model, 'findOne', async () => document);
  let saves = 0;
  t.mock.method(document, 'save', async () => { await document.validate(); saves++; return document; });
  await assert.rejects(service.changeLegs(spreadId, [{ legId, changes: { bid: 2 } }, { legId: '11111111-1111-4111-8111-111111111111', changes: { bid: 3 } }]), { status: 404 });
  assert.equal(saves, 0);
  await service.changeLegs(spreadId, [{ legId }], { remove: true });
  assert.equal(document.legs.length, 2);
  assert.equal(document.legs[0].active, false);
  assert.ok(document.legs[0].deletedAt);
  assert.equal(saves, 1);
});
