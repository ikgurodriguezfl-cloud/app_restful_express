'use strict';
const { randomUUID } = require('crypto');
const input = require('./spread-input');
const { mapSpread, legColumns } = require('../models/spread.mapper');
const { evaluateVerticalSpread, normalizeStrategyType } = require('../../../quant-service/src/services/vertical-spread');
const SELECT = '*,strategy_types(code),spread_legs(*),spread_evaluations(*)';
async function result(query) {
  const { data, error, count } = await query;
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '23505' ? 409 : /^(22|23)/.test(error.code || '') ? 400 : 502;
    input.fail(status === 403 ? 'Supabase no permite esta operación con la sesión actual.' : status === 400 ? 'Los datos no cumplen las restricciones de Supabase.' : status === 409 ? 'El registro ya existe.' : 'No se pudo completar la operación en Supabase.', status);
  }
  return { data, count };
}
class SpreadService {
  constructor(db, userId) { this.db = db; this.userId = userId; }
  owned(query) { return this.userId ? query.eq('user_id', this.userId) : query; }
  writer() { if (!this.userId) input.fail('Se requiere una sesión de Supabase.', 401); }
  async raw(id) {
    input.uuid(id);
    const { data } = await result(this.owned(this.db.from('spreads').select(SELECT).eq('id',id).is('deleted_at',null)).maybeSingle());
    if (!data) input.fail('Spread no encontrado.',404);
    return data;
  }
  async findById(id) { return mapSpread(await this.raw(id)); }
  async findAll(filters = {}, options = {}) {
    const limit = Number(options.limit ?? 50), skip = Number(options.skip ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(skip) || skip < 0) input.fail('Paginación inválida.');
    let query = this.owned(this.db.from('spreads').select(SELECT,{count:'exact'}).is('deleted_at',null));
    if (filters.underlyingTicker) query = query.eq('underlying_ticker',String(filters.underlyingTicker).toUpperCase());
    if (filters.status) query = query.eq('status',filters.status);
    if (filters.strategyType) query = query.eq('strategy_type_id',await this.typeId(filters.strategyType));
    const {data,count} = await result(query.order('created_at',{ascending:false}).range(skip,skip+limit-1));
    return {data:data.map(mapSpread),total:count};
  }
  async typeId(type) {
    const code = normalizeStrategyType(type).toLowerCase();
    const {data} = await result(this.db.from('strategy_types').select('id,code').eq('code',code).maybeSingle());
    if (!data) input.fail('Tipo de estrategia no encontrado.');
    return data.id;
  }
  validateParent(data, replace = false) {
    input.fields(data,input.spreadFields, replace ? input.spreadRequired : []);
    if ('underlyingTicker' in data && (typeof data.underlyingTicker !== 'string' || !/^[A-Za-z0-9.^-]{1,20}$/.test(data.underlyingTicker))) input.fail('Ticker inválido.');
    if ('currentStockPrice' in data) input.number(data.currentStockPrice,'currentStockPrice',0.000001);
    if ('expirationDate' in data) input.date(data.expirationDate);
    for (const key of ['quantity','multiplier']) if (key in data) { input.number(data[key],key,1); if (!Number.isInteger(data[key])) input.fail(`${key} debe ser entero.`); }
    if ('status' in data && !['draft','active','closed'].includes(data.status)) input.fail('status debe ser draft, active o closed.');
    if ('notes' in data && data.notes !== null && (typeof data.notes !== 'string' || data.notes.length > 5000)) input.fail('notes debe ser texto de hasta 5000 caracteres.');
  }
  parentRow(data) {
    const columns = {underlyingTicker:'underlying_ticker',currentStockPrice:'underlying_price',expirationDate:'expiration_date',quantity:'quantity',multiplier:'multiplier',status:'status',notes:'notes'};
    return Object.fromEntries(Object.entries(columns).filter(([key])=>key in data).map(([key,col])=>[col,key==='underlyingTicker'?data[key].toUpperCase():data[key]]));
  }
  validateLegs(legs, parent) {
    if (!Array.isArray(legs) || legs.length > 2 || (parent.status !== 'draft' && legs.length !== 2)) input.fail('Se permiten hasta dos patas en draft; active/closed requieren dos.');
    legs.forEach(leg => {
      input.fields(leg,input.legFields,input.legRequired);
      if (!['call','put'].includes(leg.optionType) || !['buy','sell'].includes(leg.action)) input.fail('optionType o action inválidos.');
      input.number(leg.strike,'strike',0.000001); input.number(leg.premium,'premium'); input.date(leg.expirationDate);
      if (leg.expirationDate !== parent.expirationDate) input.fail('Las patas deben tener el vencimiento del spread.');
      if (leg.contractSymbol != null && (typeof leg.contractSymbol !== 'string' || !leg.contractSymbol.trim())) input.fail('contractSymbol inválido.');
      for (const key of ['bid','ask','impliedVolatility','delta','gamma','theta','vega']) if (leg[key] != null) input.number(leg[key],key,['theta','delta'].includes(key)?-Infinity:0);
    });
    if (legs.length === 2) {
      try { evaluateVerticalSpread({strategyType:parent.strategyType,symbol:parent.underlyingTicker,expiration:parent.expirationDate,quantity:parent.quantity,multiplier:parent.multiplier,legs:legs.map(l=>({type:l.optionType,side:l.action,strike:l.strike,price:l.premium}))}); }
      catch(error) { input.fail(error.message); }
    }
  }
  legInput(leg) { return Object.fromEntries(Object.keys(legColumns).filter(key=>leg[key] !== undefined).map(key=>[key,leg[key]])); }
  legRow(leg, spreadId, order, id) { return {id:id || randomUUID(),spread_id:spreadId,leg_order:order,...Object.fromEntries(Object.entries(legColumns).map(([key,col])=>[col,leg[key] ?? null]))}; }
  async create(data) {
    this.writer();
    input.fields(data,[...input.spreadFields,'legs'],input.spreadRequired);
    const {legs = [],...parent} = data; this.validateParent(parent,true); this.validateLegs(legs,parent);
    const strategyTypeId = await this.typeId(parent.strategyType), id = randomUUID();
    await result(this.db.from('spreads').insert({id,user_id:this.userId,strategy_type_id:strategyTypeId,...this.parentRow(parent)}).select('id').single());
    if (legs.length) {
      try { await result(this.db.from('spread_legs').insert(legs.map((leg,i)=>this.legRow(leg,id,i+1))).select('id')); }
      catch(error) {
        // No cross-table transaction exists in the current schema. Explicit compensation.
        const cleanup = await this.db.from('spreads').delete().eq('id',id).eq('user_id',this.userId).select('id');
        if (cleanup.error || !cleanup.data?.length) { const e = new Error('No se guardaron las patas; el padre puede haber quedado creado. Consulta el listado antes de reintentar.'); e.status=502; e.spreadId=id; throw e; }
        throw error;
      }
    }
    return this.findById(id);
  }
  async updateById(id, changes, replace = false) {
    this.writer(); this.validateParent(changes,replace);
    const current = await this.findById(id), next = {...current,...changes};
    this.validateLegs(current.legs.map(l=>this.legInput(l)),next);
    const row = this.parentRow(changes);
    if (replace && !('notes' in changes)) row.notes=null;
    if ('strategyType' in changes) row.strategy_type_id=await this.typeId(changes.strategyType);
    const {data} = await result(this.db.from('spreads').update({...row,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',this.userId).is('deleted_at',null).select('id').maybeSingle());
    if (!data) input.fail('Spread no encontrado o sin permiso de actualización.',404);
    return this.findById(id);
  }
  replaceById(id,data) { return this.updateById(id,data,true); }
  async softDeleteById(id) {
    this.writer(); await this.raw(id);
    const {data} = await result(this.db.from('spreads').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',this.userId).is('deleted_at',null).select('id').maybeSingle());
    if (!data) input.fail('Spread no encontrado o sin permiso de eliminación.',404);
    return {id,deleted:true};
  }
  async getLegs(id) { return (await this.findById(id)).legs; }
  async getLeg(id,legId) { input.uuid(legId); const leg=(await this.getLegs(id)).find(l=>l.id===legId); if (!leg) input.fail('Pata no encontrada.',404); return leg; }
  async setLegs(id,legs) {
    this.writer(); const parent=await this.findById(id); this.validateLegs(legs,parent);
    if (legs.length !== 2) input.fail('Envía exactamente dos patas para establecer el conjunto.');
    const rows=legs.map((leg,i)=>this.legRow(leg,id,i+1,parent.legs.find(l=>l.legOrder===i+1)?.id));
    const written = await result(this.db.from('spread_legs').upsert(rows,{onConflict:'id'}).select('id'));
    if (written.data?.length !== rows.length) input.fail('No se pudieron guardar todas las patas con la sesión actual.',403);
    return this.findById(id);
  }
  async changeLegs(id,operations,{replace=false,remove=false}={}) {
    this.writer(); if (!Array.isArray(operations) || !operations.length || operations.length>2) input.fail('Se requieren una o dos operaciones.');
    input.ids(operations.map(op=>op?.legId)); const parent=await this.findById(id);
    operations.forEach(op=>{ if (!parent.legs.some(l=>l.id===op.legId)) input.fail('Pata no encontrada.',404); });
    if (remove) {
      if (parent.status !== 'draft') input.fail('Solo se pueden eliminar patas de un spread draft.',409);
      const removed = await result(this.db.from('spread_legs').delete().eq('spread_id',id).in('id',operations.map(op=>op.legId)).select('id'));
      if (removed.data?.length !== operations.length) input.fail('No se pudieron eliminar todas las patas con la sesión actual.',403);
    } else {
      const next=parent.legs.map(leg=>{
        const op=operations.find(o=>o.legId===leg.id); if (!op) return this.legInput(leg);
        input.fields(op.changes,input.legFields,replace?input.legRequired:[]);
        return {...(replace?{}:this.legInput(leg)),...op.changes};
      });
      this.validateLegs(next,parent);
      const written = await result(this.db.from('spread_legs').upsert(next.map((leg,i)=>this.legRow(leg,id,parent.legs[i].legOrder,parent.legs[i].id)),{onConflict:'id'}).select('id'));
      if (written.data?.length !== next.length) input.fail('No se pudieron actualizar todas las patas con la sesión actual.',403);
    }
    return this.findById(id);
  }
  async evaluate(id) {
    this.writer(); const parent=await this.findById(id);
    let calculated;
    try { calculated=evaluateVerticalSpread({strategyType:parent.strategyType,symbol:parent.underlyingTicker,expiration:parent.expirationDate,underlyingPrice:parent.currentStockPrice,quantity:parent.quantity,multiplier:parent.multiplier,legs:parent.legs.map(l=>({type:l.optionType,side:l.action,strike:l.strike,price:l.premium}))}); }
    catch(error) { input.fail(error.message); }
    const row={spread_id:id,spread_width:calculated.width,net_debit:calculated.netDebit,net_credit:calculated.netCredit,max_profit:calculated.maxProfit,max_loss:calculated.maxLoss,break_even_price:calculated.breakEven,risk_reward_ratio:calculated.riskRewardRatio,evaluated_at:calculated.evaluatedAt,assumptions:{underlyingPrice:parent.currentStockPrice,model:'vertical-spread',dataSource:'manual'}};
    const {data}=await result(this.db.from('spread_evaluations').insert(row).select('*').single());
    return {evaluation:data,calculation:calculated};
  }
  async runBatch(items,operation) {
    if (!Array.isArray(items) || !items.length || items.length>100) input.fail('Cada lote requiere entre 1 y 100 elementos.');
    const results=[];
    for (let index=0;index<items.length;index++) {
      try { results.push({index,success:true,spread:await operation(items[index])}); }
      catch(error) { if (!error.status || error.status>=500) throw error; results.push({index,success:false,status:error.status,message:error.message}); }
    }
    return {atomic:false,results};
  }
}
module.exports = { SpreadService, result };
