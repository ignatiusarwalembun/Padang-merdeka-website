async function sendReservation(job, config){
  const url = `${String(config.baseUrl).replace(/\/$/,'')}${config.reservationPath}`;
  const headers = {'Content-Type':'application/json'};
  if(config.localToken) headers.Authorization = `Bearer ${config.localToken}`;
  const response = await fetch(url,{method:'POST',headers,body:JSON.stringify({source:'padang-merdeka-web',jobId:job.id,reservation:job.payload})});
  const text = await response.text();
  if(!response.ok) throw new Error(`Local POS ${response.status}: ${text.slice(0,300)}`);
  return text;
}
module.exports={sendReservation};
