const {test} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('crypto');
const {SpreadService} = require('../src/services/spread.service');
const uid=randomUUID(), typeId=randomUUID();
const payload={strategyType:'BULL_CALL_SPREAD',underlyingTicker:'AAPL',currentStockPrice:190,expirationDate:'2026-12-18',quantity:1,multiplier:100,status:'active',legs:[{optionType:'call',action:'buy',strike:190,premium:4,expirationDate:'2026-12-18'},{optionType:'call',action:'sell',strike:195,premium:2,expirationDate:'2026-12-18'}]};
function database() {
 const tables={strategy_types:[{id:typeId,code:'bull_call_spread'}],spreads:[],spread_legs:[],spread_evaluations:[]};
 const calls=[]; let failTable;
 const db={tables,calls,failOn:table=>{failTable=table;},from(table){
  let action='select',values,filters=[],single=false,start=0,end=Infinity,sort;
  const q={
   select(){return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},is(k,v){filters.push(row=>(row[k]??null)===v);return q;},in(k,v){filters.push(row=>v.includes(row[k]));return q;},
   maybeSingle(){single=true;return q;},single(){single=true;return q;},order(k,opts){sort=[k,opts];return q;},range(a,b){start=a;end=b;return q;},
   insert(v){action='insert';values=v;return q;},upsert(v){action='upsert';values=v;return q;},update(v){action='update';values=v;return q;},delete(){action='delete';return q;},
   then(resolve,reject){return Promise.resolve().then(()=>{
    calls.push({table,action,values});
    if(failTable===table && action!=='select') return {data:null,error:{code:'42501'}};
    let rows=tables[table].filter(row=>filters.every(fn=>fn(row)));
    if(action==='insert'||action==='upsert') {
     rows=(Array.isArray(values)?values:[values]).map(value=>{
      const old=action==='upsert'?tables[table].find(row=>row.id===value.id):null;
      if(old){Object.assign(old,value);return old;}
      const row={id:randomUUID(),...value};tables[table].push(row);return row;
     });
    } else if(action==='update') rows.forEach(row=>Object.assign(row,values));
    else if(action==='delete') tables[table]=tables[table].filter(row=>!rows.includes(row));
    const count=rows.length;
    if(sort)rows.sort((a,b)=>String(a[sort[0]]).localeCompare(String(b[sort[0]]))*(sort[1].ascending?1:-1));
    rows=rows.slice(start,end+1).map(row=>table==='spreads'?{...row,strategy_types:tables.strategy_types.find(t=>t.id===row.strategy_type_id),spread_legs:tables.spread_legs.filter(l=>l.spread_id===row.id),spread_evaluations:tables.spread_evaluations.filter(e=>e.spread_id===row.id)}:{...row});
    return {data:single?(rows[0]||null):rows,count,error:null};
   }).then(resolve,reject);}
  };return q;
 }};return db;
}
test('Supabase: create, read, evaluate, update, replace and soft delete',async()=>{
 const db=database(),s=new SpreadService(db,uid);
 const created=await s.create(payload);
 assert.equal(created.userId,uid);assert.equal(created.legs.length,2);assert.equal(db.tables.spreads[0].underlying_ticker,'AAPL');
 assert.equal(db.tables.spread_legs[0].spread_id,created.id);
 const evaluation=await s.evaluate(created.id);assert.equal(evaluation.calculation.maxProfit,300);assert.equal(evaluation.evaluation.break_even_price,192);
 const changed=await s.updateById(created.id,{notes:'updated'});assert.equal(changed.notes,'updated');
 const {legs,...parent}=payload;await s.replaceById(created.id,parent);assert.equal(db.tables.spreads[0].notes,null);
 const list=await s.findAll({},{});assert.equal(list.total,1);
 await s.softDeleteById(created.id);assert.equal((await s.findAll()).total,0);await assert.rejects(s.findById(created.id),{status:404});
});
test('Ownership cannot be supplied or reassigned; another user cannot access spread',async()=>{
 const db=database(),s=new SpreadService(db,uid);const p=await s.create(payload);
 await assert.rejects(s.updateById(p.id,{userId:randomUUID()}),{status:400});
 await assert.rejects(new SpreadService(db,randomUUID()).findById(p.id),{status:404});
 await assert.rejects(new SpreadService(db).create(payload),{status:401});
});
test('Invalid financial structures and partial PUT fail before writing',async()=>{
 const db=database(),s=new SpreadService(db,uid);
 await assert.rejects(s.create({...payload,quantity:0}),{status:400});
 await assert.rejects(s.create({...payload,legs:[payload.legs[0]]}),{status:400});
 await assert.rejects(s.create({...payload,expirationDate:'2026-02-30'}),{status:400});
 const p=await s.create(payload);const before=db.calls.length;
 await assert.rejects(s.replaceById(p.id,{notes:'partial'}),{status:400});assert.equal(db.calls.length,before);
 await assert.rejects(s.updateById(p.id,{strategyType:'BEAR_CALL_SPREAD'}),{status:400});
});
test('Leg changes validate the whole spread; drafts allow physical leg removal',async()=>{
 const db=database(),s=new SpreadService(db,uid),p=await s.create(payload);
 await assert.rejects(s.changeLegs(p.id,[{legId:p.legs[0].id}],{remove:true}),{status:409});
 await assert.rejects(s.changeLegs(p.id,[{legId:p.legs[0].id,changes:{premium:10}}]),{status:400});
 await s.updateById(p.id,{status:'draft'});
 await s.changeLegs(p.id,[{legId:p.legs[0].id}],{remove:true});assert.equal((await s.getLegs(p.id)).length,1);
 await assert.rejects(s.updateById(p.id,{status:'active'}),{status:400});
 await s.setLegs(p.id,payload.legs);const restored=await s.getLegs(p.id);assert.equal(restored.length,2);assert.deepEqual(restored.map(l=>l.legOrder),[1,2]);
});
test('Failed child insert compensates its parent; RLS errors are not hidden',async()=>{
 const db=database(),s=new SpreadService(db,uid);db.failOn('spread_legs');
 await assert.rejects(s.create(payload),{status:403});assert.equal(db.tables.spreads.length,0);
});
test('Pagination rejects invalid inputs',async()=>{
 const s=new SpreadService(database(),uid);
 await assert.rejects(s.findAll({}, {limit:1.5}),{status:400});
 await assert.rejects(s.findAll({}, {skip:-1}),{status:400});
});
