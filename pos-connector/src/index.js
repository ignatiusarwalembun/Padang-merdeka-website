require('dotenv').config();
const { sendReservation } = require('./adapters/generic-http');

const API_BASE_URL=String(process.env.API_BASE_URL||'http://localhost:3000').replace(/\/$/,'');
const TOKEN=process.env.POS_CONNECTOR_TOKEN||'dev-pos-token';
const POLL=Math.max(Number(process.env.POLL_INTERVAL_MS)||5000,1000);
const posConfig={baseUrl:process.env.POS_BASE_URL||'http://localhost:5050',reservationPath:process.env.POS_RESERVATION_PATH||'/api/reservations',localToken:process.env.POS_LOCAL_TOKEN||''};
let busy=false;

async function api(path,options={}){
  const res=await fetch(`${API_BASE_URL}${path}`,{...options,headers:{'Content-Type':'application/json','Authorization':`Bearer ${TOKEN}`,...(options.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||`Cloud API ${res.status}`);return data;
}
async function ack(job,status,message=''){return api(`/api/pos/jobs/${encodeURIComponent(job.id)}/ack`,{method:'POST',body:JSON.stringify({status,message})})}
async function handleJob(job){
  try{
    if(job.type==='reservation.confirmed') await sendReservation(job,posConfig);
    else throw new Error(`Unsupported POS job type: ${job.type}`);
    await ack(job,'sent');console.log(`[POS] sent ${job.id} -> ${posConfig.baseUrl}${posConfig.reservationPath}`);
  }catch(err){console.error(`[POS] failed ${job.id}:`,err.message);await ack(job,'failed',err.message).catch(e=>console.error('[POS] ack failed:',e.message));}
}
async function poll(){
  if(busy)return;busy=true;
  try{const {jobs=[]}=await api('/api/pos/jobs?limit=20');for(const job of jobs)await handleJob(job);}catch(err){console.error('[CONNECTOR]',err.message)}finally{busy=false}
}
console.log('Padang Merdeka POS Connector');
console.log(`Cloud: ${API_BASE_URL}`);console.log(`Local POS: ${posConfig.baseUrl}${posConfig.reservationPath}`);
poll();setInterval(poll,POLL);
