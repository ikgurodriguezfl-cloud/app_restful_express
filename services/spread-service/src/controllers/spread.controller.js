'use strict';
const input = require('../services/spread-input');
const handle = (operation,status=200) => async(req,res,next)=>{try{res.status(status).json(await operation(req,req.spreadService));}catch(error){next(error);}};
const id = req=>input.uuid(req.params.id);
const parent = req=>input.uuid(req.params.spreadId);
const body = req=>input.object(req.body);
module.exports = {
 listSpreads:handle((req,s)=>{ const allowed=['underlyingTicker','strategyType','status','limit','skip']; if(Object.keys(req.query).some(k=>!allowed.includes(k))) input.fail('Filtro no admitido.'); return s.findAll(req.query,req.query); }),
 createSpread:handle((req,s)=>s.create(body(req)),201),
 getSpread:handle((req,s)=>s.findById(id(req))),
 updateSpread:handle((req,s)=>s.updateById(id(req),body(req))),
 replaceSpread:handle((req,s)=>s.replaceById(id(req),body(req))),
 deleteSpread:handle((req,s)=>s.softDeleteById(id(req))),
 createSpreadsBatch:handle((req,s)=>s.runBatch(body(req).spreads,data=>s.create(data)),201),
 updateSpreadsBatch:handle((req,s)=>s.runBatch(body(req).operations,op=>{input.object(op);return s.updateById(input.uuid(op.spreadId),op.changes);})),
 deleteSpreadsBatch:handle((req,s)=>s.runBatch(body(req).spreadIds,value=>s.softDeleteById(input.uuid(value)))),
 getLegs:handle((req,s)=>s.getLegs(parent(req))),
 getLeg:handle((req,s)=>s.getLeg(parent(req),input.uuid(req.params.legId))),
 setLegs:handle((req,s)=>s.setLegs(parent(req),req.body),201),
 replaceLegs:handle((req,s)=>s.setLegs(parent(req),body(req).legs)),
 updateLeg:handle((req,s)=>s.changeLegs(parent(req),[{legId:input.uuid(req.params.legId),changes:body(req)}])),
 replaceLeg:handle((req,s)=>s.changeLegs(parent(req),[{legId:input.uuid(req.params.legId),changes:body(req)}],{replace:true})),
 deleteLeg:handle((req,s)=>s.changeLegs(parent(req),[{legId:input.uuid(req.params.legId)}],{remove:true})),
 updateLegsBatch:handle((req,s)=>s.changeLegs(parent(req),body(req).operations)),
 deleteLegsBatch:handle((req,s)=>s.changeLegs(parent(req),input.ids(body(req).legIds).map(legId=>({legId})),{remove:true})),
 evaluateSpread:handle((req,s)=>s.evaluate(id(req)),201),
};
