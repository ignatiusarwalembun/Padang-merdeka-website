const http=require('http');
const PORT=Number(process.env.MOCK_POS_PORT||5050);
const server=http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/api/reservations'){
    let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{const data=JSON.parse(body||'{}');console.log('\n=== RESERVASI MASUK KE MOCK POS LOCALHOST ===');console.dir(data,{depth:6,colors:true});console.log('===========================================\n');res.writeHead(201,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,receivedAt:new Date().toISOString()}));}catch(e){res.writeHead(400);res.end('invalid json')}});return;
  }
  if(req.method==='GET'&&req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,service:'mock-local-pos'}));}
  res.writeHead(404);res.end('not found');
});
server.listen(PORT,()=>console.log(`Mock local POS listening on http://localhost:${PORT}`));
