const express = require('express');
const { createDatabase } = require('./db');
const { SpreadService } = require('./services/spread.service');
function createApp(databaseFactory = createDatabase) {
 const app = express();
 app.use(express.json({limit:'256kb'}));
 app.get('/health',(_req,res)=>res.json({status:'OK',service:'spread-service',database:'supabase'}));
 app.use('/api/v1/spreads',async(req,res,next)=>{
  try {
   const header=req.get('authorization'); let token;
   if(header) { if(!/^Bearer \S+$/.test(header)) return res.status(401).json({message:'Authorization debe contener Bearer <access_token>.'}); token=header.slice(7); }
   if(!token && !['GET','HEAD','OPTIONS'].includes(req.method)) return res.status(401).json({message:'Se requiere el access_token de una sesión de Supabase.'});
   const db=databaseFactory(token); let userId;
   if(token) { const {data,error}=await db.auth.getUser(token); if(error || !data?.user) return res.status(401).json({message:'Sesión de Supabase inválida o vencida.'}); userId=data.user.id; }
   req.spreadService=new SpreadService(db,userId); next();
  } catch(error) {next(error);}
 });
 app.use('/api/v1',require('./routes'));
 app.use((req,res)=>res.status(404).json({message:`Ruta no encontrada: ${req.method} ${req.originalUrl}`}));
 app.use((error,req,res,next)=>{
  if(res.headersSent) return next(error);
  const status=error.status || 500;
  res.status(status).json({message:status>=500 && status!==502 && status!==503?'Error interno del servidor.':error.message,...(error.spreadId?{spreadId:error.spreadId}:{} )});
 });
 return app;
}
module.exports=createApp();
module.exports.createApp=createApp;
