'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { SpreadService } = require('../src/services/spread.service');
const service = SpreadService.prototype;

const app = require('../src/app').createApp(() => ({ auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}}})} }));
const input = require('../src/services/spread-input');
const spreadId = '11111111-1111-4111-8111-111111111111';
const legId = '5b2bd39b-cd46-4db8-9ac8-aad9f308d561';
const leg = { contractSymbol: 'AAPL261218C00190000', optionType: 'call', action: 'buy', strike: 190, expirationDate: '2026-12-18' };
const data = { key: 'test_spread', label: 'Test', underlyingTicker: 'AAPL', currentStockPrice: 190,
  strategyType: 'bull_call', spreadCategory: 'debit', width: 5, netDebitOrCredit: -2,
  maxProfit: 300, maxLoss: 200, riskRewardRatio: 1.5, breakEvenPrice: 192,
  sigmaMultiplier: 1, calculatedSigmaValue: 5, legs: [] };
let server;
after(() => server?.close());

test('Las 18 rutas y el guardado de evaluaciones despachan al servicio esperado sin acceder a Supabase', async t => {
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
    ['POST', `/${spreadId}/evaluations`, 'evaluate', {}, 201],
  ];
  for (const [method, path, name, body, status = 200] of cases) {
    await t.test(`${method} ${path || '/'}`, async t => {
      let called = false;
      t.mock.method(service, name, async (...args) => { called = true; assert.ok(args.length); return { marker: name }; });
      const response = await fetch(url + path, { method, headers: { 'Content-Type': 'application/json', Authorization:'Bearer test-session' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(response.status, status);
      const result = await response.json();
      assert.equal(result.marker || result.spread?.marker, name);
      assert.equal(called, true);
    });
  }
  await t.test('Errores de entrada, 404 y JSON inválido', async () => {
    for (const [method, path, body, expected] of [
      ['PATCH', '/bad', { label: 'x' }, 400],

      ['GET', '?sort=no-json', undefined, 400],
      ['GET', `/${spreadId}/legs/bad`, undefined, 400],
      ['GET', '/unknown/path/here', undefined, 404],
    ]) {
      const res = await fetch(url + path, { method, headers: { 'Content-Type': 'application/json', Authorization:'Bearer test-session' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(res.status, expected);
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization:'Bearer test-session' }, body: '{' });
    assert.equal(res.status, 400);
  });
});

test('Lotes permiten éxito parcial y no ocultan fallos del servidor', async () => {
  const result = await new SpreadService({}).runBatch([1, 2], async value => { if (value === 2) input.fail('invalid'); return { value }; });
  assert.equal(result.atomic, false);
  assert.deepEqual(result.results.map(item => item.success), [true, false]);
  await assert.rejects(new SpreadService({}).runBatch([], () => {}), { status: 400 });
  await assert.rejects(new SpreadService({}).runBatch(Array(101).fill(1), () => {}), { status: 400 });
  await assert.rejects(new SpreadService({}).runBatch([1], () => { throw new Error('database down'); }), /database down/);
});


test('Authentication rejects absent and invalid sessions before writes',async()=>{
 const app = require('../src/app').createApp(()=>({auth:{getUser:async()=>({error:{message:'expired'}})}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try {
  const url=`http://127.0.0.1:${server.address().port}/api/v1/spreads`;
  for(const headers of [{},{Authorization:'Bearer expired'},{Authorization:'Basic invalid'}]) {
   const response=await fetch(url,{method:'POST',headers});assert.equal(response.status,401);
  }
 } finally {await new Promise(resolve=>server.close(resolve));}
});
