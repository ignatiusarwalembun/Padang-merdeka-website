const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

class JsonStore {
  constructor(filePath) { this.filePath = filePath; this.data = {reservations:[], posJobs:[]}; }
  async init() {
    await fs.mkdir(path.dirname(this.filePath), {recursive:true});
    try { this.data = JSON.parse(await fs.readFile(this.filePath, 'utf8')); }
    catch { await this.persist(); }
    this.data.reservations ||= []; this.data.posJobs ||= [];
  }
  async persist(){ await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2)); }
  async createReservation(r){ this.data.reservations.unshift(r); await this.persist(); return r; }
  async listReservations({status,limit=200}={}) { return this.data.reservations.filter(r=>!status||r.status===status).slice(0,limit); }
  async getReservation(id){ return this.data.reservations.find(r=>r.id===id)||null; }
  async updateReservationStatus(id,status){ const r=await this.getReservation(id); if(!r)return null;r.status=status;r.updatedAt=new Date().toISOString();await this.persist();return r; }
  async createPosJob(job){ if(this.data.posJobs.some(j=>j.id===job.id)) return this.data.posJobs.find(j=>j.id===job.id);this.data.posJobs.unshift(job);await this.persist();return job; }
  async listPosJobs({status='pending',limit=20}={}){ return this.data.posJobs.filter(j=>!status||j.status===status).slice(0,limit); }
  async ackPosJob(id,{status,lastError}){ const j=this.data.posJobs.find(x=>x.id===id);if(!j)return null;j.status=status;j.lastError=lastError||null;j.attempts=(j.attempts||0)+1;j.updatedAt=new Date().toISOString();await this.persist();return j; }
}

class PgStore {
  constructor(url){ this.pool=new Pool({connectionString:url,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined}); }
  async init(){
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id text PRIMARY KEY, outlet text NOT NULL, name text NOT NULL, phone text NOT NULL,
        guests integer NOT NULL, date date NOT NULL, time text NOT NULL, area text,
        note text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pos_jobs (
        id text PRIMARY KEY, type text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);
      CREATE INDEX IF NOT EXISTS pos_jobs_status_idx ON pos_jobs(status);
    `);
  }
  mapReservation(row){return row?{id:row.id,outlet:row.outlet,name:row.name,phone:row.phone,guests:row.guests,date:String(row.date).slice(0,10),time:row.time,area:row.area,note:row.note,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}:null}
  mapJob(row){return row?{id:row.id,type:row.type,payload:row.payload,status:row.status,attempts:row.attempts,lastError:row.last_error,createdAt:row.created_at,updatedAt:row.updated_at}:null}
  async createReservation(r){const q=await this.pool.query(`INSERT INTO reservations(id,outlet,name,phone,guests,date,time,area,note,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[r.id,r.outlet,r.name,r.phone,r.guests,r.date,r.time,r.area,r.note,r.status,r.createdAt,r.updatedAt]);return this.mapReservation(q.rows[0])}
  async listReservations({status,limit=200}={}){const params=[];let where='';if(status){params.push(status);where=`WHERE status=$${params.length}`;}params.push(limit);const q=await this.pool.query(`SELECT * FROM reservations ${where} ORDER BY created_at DESC LIMIT $${params.length}`,params);return q.rows.map(r=>this.mapReservation(r))}
  async getReservation(id){const q=await this.pool.query('SELECT * FROM reservations WHERE id=$1',[id]);return this.mapReservation(q.rows[0])}
  async updateReservationStatus(id,status){const q=await this.pool.query('UPDATE reservations SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[id,status]);return this.mapReservation(q.rows[0])}
  async createPosJob(j){const q=await this.pool.query(`INSERT INTO pos_jobs(id,type,payload,status,attempts,last_error,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET id=EXCLUDED.id RETURNING *`,[j.id,j.type,JSON.stringify(j.payload),j.status,j.attempts,j.lastError,j.createdAt,j.updatedAt]);return this.mapJob(q.rows[0])}
  async listPosJobs({status='pending',limit=20}={}){const q=await this.pool.query('SELECT * FROM pos_jobs WHERE status=$1 ORDER BY created_at ASC LIMIT $2',[status,limit]);return q.rows.map(r=>this.mapJob(r))}
  async ackPosJob(id,{status,lastError}){const q=await this.pool.query('UPDATE pos_jobs SET status=$2,last_error=$3,attempts=attempts+1,updated_at=NOW() WHERE id=$1 RETURNING *',[id,status,lastError||null]);return this.mapJob(q.rows[0])}
}

async function createStore(){
  const store = process.env.DATABASE_URL
    ? new PgStore(process.env.DATABASE_URL)
    : new JsonStore(path.join(__dirname,'..','data','db.json'));
  await store.init();
  return store;
}
module.exports={createStore};
