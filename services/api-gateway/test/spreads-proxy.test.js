const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
test('Gateway forwards spread path, method, body and user session',async()=>{
 const backend=http.createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:req.url,method:req.method,auth:req.headers.authorization,body}));});});
 backend.listen(0,'127.0.0.1');await new Promise(resolve=>backend.once('listening',resolve));
 process.env.SPREAD_SERVICE_URL=`http://127.0.0.1:${backend.address().port}`;
 const gateway=require('../src/app').listen(0,'127.0.0.1');await new Promise(resolve=>gateway.once('listening',resolve));
 process.env.GATEWAY_SERVICE_URL=`http://127.0.0.1:${gateway.address().port}`;
 const gui=require('../../gui-service/src/server').listen(0,'127.0.0.1');await new Promise(resolve=>gui.once('listening',resolve));
 try {
  const response=await fetch(`http://127.0.0.1:${gateway.address().port}/api/v1/spreads/batch`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer test-user'},body:JSON.stringify({operations:[]})});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{path:'/api/v1/spreads/batch',method:'PATCH',auth:'Bearer test-user',body:'{"operations":[]}'});
  const guiUrl=`http://127.0.0.1:${gui.address().port}`;
  const html=await (await fetch(guiUrl)).text();assert.match(html,/id="btnSaveSpread"/);assert.match(html,/id="savePassword"/);
  const session=await fetch(guiUrl+'/api/supabase/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(session.status,400);
  const proxied=await fetch(guiUrl+'/api/v1/spreads',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-user'},body:'{"status":"draft"}'});
  assert.equal(proxied.status,200);const forwarded=await proxied.json();assert.equal(forwarded.body,'{"status":"draft"}');assert.equal(forwarded.auth,'Bearer test-user');
  const absent=await fetch(`http://127.0.0.1:${gateway.address().port}/api/v1/spreads-other`);assert.equal(absent.status,404);
 } finally {await new Promise(resolve=>gui.close(resolve));await new Promise(resolve=>gateway.close(resolve));await new Promise(resolve=>backend.close(resolve));}
});
