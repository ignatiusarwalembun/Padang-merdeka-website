require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createStore } = require('./store');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';
const POS_CONNECTOR_TOKEN = process.env.POS_CONNECTOR_TOKEN || 'dev-pos-token';
const origins = String(process.env.FRONTEND_ORIGINS || 'http://localhost:5510,http://127.0.0.1:5510').split(',').map(s=>s.trim()).filter(Boolean);
const allowedStatuses = new Set(['pending','confirmed','rejected']);
const clean = value => String(value ?? '').trim();

function publicReservation(r){ return {id:r.id,outlet:r.outlet,guests:r.guests,date:r.date,time:r.time,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt}; }
function adminAuth(req,res,next){ if(req.get('x-admin-key')!==ADMIN_API_KEY)return res.status(401).json({error:'Admin API key tidak valid.'});next(); }
function posAuth(req,res,next){ if(req.get('authorization')!==`Bearer ${POS_CONNECTOR_TOKEN}`)return res.status(401).json({error:'POS connector token tidak valid.'});next(); }
function validateReservation(body){
  const r={outlet:clean(body.outlet),name:clean(body.name),phone:clean(body.phone),guests:Number(body.guests),date:clean(body.date),time:clean(body.time),area:clean(body.area)||'Bebas',note:clean(body.note)};
  if(!r.outlet||!r.name||!r.phone||!r.date||!r.time) return {error:'Outlet, nama, WhatsApp, tanggal dan jam wajib diisi.'};
  if(!Number.isInteger(r.guests)||r.guests<1||r.guests>50) return {error:'Jumlah tamu harus antara 1–50.'};
  if(r.name.length>120||r.phone.length>40||r.note.length>800) return {error:'Data reservasi terlalu panjang.'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!/^\d{2}:\d{2}$/.test(r.time)) return {error:'Format tanggal atau jam tidak valid.'};
  return {value:r};
}

(async()=>{
  const store=await createStore();
  const app=express();
  app.set('trust proxy',1);
  app.use(helmet({crossOriginResourcePolicy:false}));
  app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);cb(new Error('Origin tidak diizinkan CORS.'));}}));
  app.use(express.json({limit:'200kb'}));
  app.use(morgan('combined'));

  app.get('/health',(req,res)=>res.json({ok:true,service:'padang-merdeka-backend',database:process.env.DATABASE_URL?'postgres':'json-local'}));

  app.post('/api/reservations',async(req,res,next)=>{try{
    const parsed=validateReservation(req.body);if(parsed.error)return res.status(400).json({error:parsed.error});
    const now=new Date().toISOString();const reservation={id:`PM-${crypto.randomUUID().slice(0,8).toUpperCase()}`,...parsed.value,status:'pending',createdAt:now,updatedAt:now};
    const saved=await store.createReservation(reservation);res.status(201).json({reservation:publicReservation(saved)});
  }catch(e){next(e)}});

  app.get('/api/reservations/:id/status',async(req,res,next)=>{try{const r=await store.getReservation(req.params.id);if(!r)return res.status(404).json({error:'Reservasi tidak ditemukan.'});res.json({reservation:publicReservation(r)});}catch(e){next(e)}});

  app.get('/api/reservations',adminAuth,async(req,res,next)=>{try{const limit=Math.min(Math.max(Number(req.query.limit)||200,1),500);const status=req.query.status&&allowedStatuses.has(req.query.status)?req.query.status:undefined;res.json({reservations:await store.listReservations({status,limit})});}catch(e){next(e)}});

  app.patch('/api/reservations/:id/status',adminAuth,async(req,res,next)=>{try{
    const status=clean(req.body.status);if(!['confirmed','rejected'].includes(status))return res.status(400).json({error:'Status harus confirmed atau rejected.'});
    const current=await store.getReservation(req.params.id);if(!current)return res.status(404).json({error:'Reservasi tidak ditemukan.'});
    const updated=await store.updateReservationStatus(req.params.id,status);
    let posJob=null;
    if(status==='confirmed'){
      const now=new Date().toISOString();
      posJob=await store.createPosJob({id:`POS-${updated.id}`,type:'reservation.confirmed',payload:updated,status:'pending',attempts:0,lastError:null,createdAt:now,updatedAt:now});
    }
    res.json({reservation:updated,posJob:posJob?{id:posJob.id,status:posJob.status}:null});
  }catch(e){next(e)}});

  app.get('/api/pos/jobs',posAuth,async(req,res,next)=>{try{const limit=Math.min(Math.max(Number(req.query.limit)||20,1),100);const jobs=await store.listPosJobs({status:'pending',limit});res.json({jobs});}catch(e){next(e)}});
  app.post('/api/pos/jobs/:id/ack',posAuth,async(req,res,next)=>{try{const status=clean(req.body.status);if(!['sent','failed'].includes(status))return res.status(400).json({error:'Status ack harus sent atau failed.'});const job=await store.ackPosJob(req.params.id,{status,lastError:clean(req.body.message)});if(!job)return res.status(404).json({error:'POS job tidak ditemukan.'});res.json({job});}catch(e){next(e)}});

  app.use((err,req,res,next)=>{console.error(err);if(String(err.message).includes('CORS'))return res.status(403).json({error:err.message});res.status(500).json({error:'Terjadi kesalahan pada server.'});});
  app.listen(PORT,()=>console.log(`Padang Merdeka backend running on http://localhost:${PORT}`));
})().catch(err=>{console.error('Fatal startup error:',err);process.exit(1)});
