// Run only on a fresh temporary cluster. Never reads the workspace .env or hosted database.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {createServer}=require('node:net');
const assert=require('node:assert/strict');
const backend=path.resolve(__dirname,'..');
if(!process.argv.includes('--fixture-child')) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'traveling-ai-integration-'));
  const env={...process.env};
  for(const key of Object.keys(env))if(/^(DATABASE_|SUPABASE_|STRIPE_|MOCK_|PAYMENT_|BOOKING_|CANCELLATION_|EMAIL_|AI_|OPENAI_|TAX_RATE$|PG)/i.test(key))delete env[key];
  const child=spawnSync(process.execPath,[__filename,'--fixture-child'],{cwd:temp,env,stdio:'inherit',windowsHide:true});
  console.log('Disposable AI fixture retained at '+temp);
  const evidence=path.join(temp,'ai-results.json');
  process.exitCode=child.status===0&&fs.existsSync(evidence)?0:1;
  if(process.exitCode)console.error('AI integration failed or no fresh passing evidence was written.');
} else {
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
async function main() {
  if(fs.existsSync('.env'))throw new Error('Refuse fixture directory containing .env');
  const EmbeddedPostgres=require('embedded-postgres').default;
  const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
  const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const password=randomUUID(), db=new EmbeddedPostgres({databaseDir:path.resolve('pgdata'),user:'test_owner',password,port,persistent:true,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  let client,pool,server;const results=[];
  async function check(name,fn){await fn();results.push(name);console.log('PASS '+name);}
  try {
    await db.initialise();await db.start();client=db.getPgClient('postgres','127.0.0.1');await client.connect();
    await client.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'::jsonb); CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid); CREATE TABLE auth.refresh_tokens(id bigserial PRIMARY KEY,user_id text)");
    await client.query(fs.readFileSync(path.join(backend,'../database/schema.sql'),'utf8'));
    const migrationDir=path.join(backend,'../database/migrations');
    // Schema dependencies only. Catalog data migrations 009-013 are tested by the full suite.
    for(const file of fs.readdirSync(migrationDir).filter(f=>/^(00[1-8]_|014_).*\.sql$/.test(f)).sort())await client.query(fs.readFileSync(path.join(migrationDir,file),'utf8'));
    await client.query(fs.readFileSync(path.join(migrationDir,'014_ai_usage_budget.sql'),'utf8'));
    const guest=randomUUID(),other=randomUUID(),blocked=randomUUID(),host=randomUUID();
    for(const id of [guest,other,blocked,host])await client.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,id+'@example.test']);
    await client.query("UPDATE users SET account_status='blocked' WHERE id=$1",[blocked]);
    await client.query("UPDATE users SET role='host' WHERE id=$1",[host]);
    const category=(await client.query("INSERT INTO categories(name,slug,icon_name) VALUES('Fixture','fixture','home') RETURNING id")).rows[0].id;
    const listing=(await client.query("INSERT INTO listings(host_id,category_id,title,city,country,region,price_per_night,cleaning_fee,service_fee,max_guests,bedrooms,beds,bathrooms) VALUES($1,$2,'AI fixture','Đà Lạt','Vietnam','Asia',42,5,5,2,1,1,1) RETURNING id",[host,category])).rows[0].id;
    const bookingId=(await client.query("INSERT INTO bookings(booking_code,guest_id,listing_id,check_in_date,check_out_date,number_of_guests,price_per_night,cleaning_fee,service_fee,total_price,payment_due_at) VALUES('AI-FIXTURE',$1,$2,'2099-07-10','2099-07-12',2,42,5,5,94,now()+interval '15 minutes') RETURNING id",[guest,listing])).rows[0].id;
    const url=new URL(`postgresql://test_owner:${password}@127.0.0.1:${port}/postgres`);url.searchParams.set('options','-c role=traveling_backend');
    Object.assign(process.env,{NODE_ENV:'test',PAYMENT_MODE:'disabled',DATABASE_SSL:'disable',DATABASE_URL:url.toString(),SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',AI_ENABLED:'false',AI_MODEL:'fixture-model',OPENAI_API_KEY:'fixture-only'});
    const get=name=>require(path.join(backend,'dist',name));
    pool=get('config/database.js').pool;
    const supabase=get('config/supabase.js').supabaseAdmin;
    const tokens=Object.fromEntries([guest,other,blocked].map(id=>[id,'eyJhbGciOiJURVNUIn0.'+Buffer.from(JSON.stringify({sub:id,iat:Math.floor(Date.now()/1000)+1})).toString('base64url')+'.test']));
    supabase.auth.getUser=async token=>{const id=Object.keys(tokens).find(id=>tokens[id]===token);return {data:{user:id?{id}:null},error:id?null:{status:401,message:'invalid'}};};
    const config=get('config/ai.js').AI_CONFIG;
    const adapter=get('services/aiProvider.js');let providerCalls=0;
    adapter.OpenAiProvider.prototype.complete=async()=>{providerCalls++;return {value:{destination:'Da Lat',country:null,dateKind:'exact',checkIn:'2099-07-10',checkOut:'2099-07-12',guests:2,maxBudget:100,currency:'USD',budgetUnit:'night',amenities:[],propertyType:null,unsupported:[]},inputTokens:50,outputTokens:40};};
    const app=get('app.js').createApp();server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
    const api=async(endpoint,body,id)=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/ai/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+tokens[id]}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};};
    await check('disabled search provides explicit fallback without provider',async()=>{const r=await api('search',{message:'homestay Da Lat'});assert.equal(r.body.data.reason,'disabled');assert.equal(providerCalls,0);});
    await check('owner-only booking help, auth/blocked and cache isolation',async()=>{
      assert.equal((await api('help',{message:'status',bookingId})).status,401);
      assert.equal((await api('help',{message:'status',bookingId},other)).status,404);
      assert.equal((await api('help',{message:'status',bookingId},blocked)).status,403);
      const r=await api('help',{message:'status',bookingId},guest);assert.equal(r.status,200);assert.equal(r.body.data.mode,'data');assert.match(r.body.data.answer,/94.00 USD/);assert.match(r.cache,/no-store/);assert.equal(providerCalls,0);
    });
    await check('enabled search uses actual database availability and price',async()=>{
      config.enabled=true;
      // Existing fixture booking occupies these dates; changing dates must be explicit.
      const first=await api('search',{message:'fixture'},guest);assert.equal(first.status,200);assert.equal(first.body.data.total,0);
      await client.query("UPDATE bookings SET booking_status='cancelled' WHERE id=$1",[bookingId]);
      const second=await api('search',{message:'fixture'},guest);assert.equal(second.status,200);assert.equal(second.body.data.items[0].id,listing);assert.equal(second.body.data.items[0].nightly_rate,42);assert.equal(second.body.data.items[0].pricing.tripTotal,94);
    });
    await check('body impersonation rejected and repeated calls rate-limited',async()=>{
      const r=await api('help',{message:'status',userId:guest},other);assert.equal(r.status,400);
      let limited=false;for(let i=0;i<12;i++){const next=await api('help',{message:'status'},other);if(next.status===429){limited=true;break;}}assert.equal(limited,true);
    });
    await check('daily quota atomically serializes concurrent calls and survives new clients',async()=>{
      const repo=get('repositories/ai.repository.js');config.dailyRequests=2;
      const calls=await Promise.allSettled(Array.from({length:4},()=>repo.reserveAiBudget('concurrency-fixture',10)));
      assert.equal(calls.filter(r=>r.status==='fulfilled').length,2);
      assert.equal(calls.filter(r=>r.status==='rejected'&&r.reason.reason==='quota').length,2);
      const r=await client.query("SELECT requests FROM ai_usage_daily WHERE scope_key LIKE 'subject:%' AND requests=2");assert.ok(r.rowCount>=1);
      const ticket=calls.find(r=>r.status==='fulfilled').value;await repo.recordAiUsage(ticket,5,2,false);
      const row=(await client.query('SELECT input_tokens,output_tokens FROM ai_usage_daily WHERE day=$1 AND scope_key=$2',[ticket.day,ticket.key])).rows[0];assert.equal(Number(row.input_tokens),5);assert.equal(Number(row.output_tokens),2);
      config.dailyTokens=1;await assert.rejects(repo.reserveAiBudget('global-blocked',10),e=>e.reason==='quota');
    });
    await check('anonymous clients cannot access AI usage metadata',async()=>{
      await client.query('BEGIN');try{await client.query('SET LOCAL ROLE anon');await assert.rejects(client.query('SELECT * FROM ai_usage_daily'),e=>e.code==='42501');}finally{await client.query('ROLLBACK');}
    });
    const evidence={suite:'ai-database-http',passed:results.length,provider:'stub',migrations:'001-008,014',realProviderCalls:0,checkedAt:new Date().toISOString(),tests:results};
    fs.writeFileSync('ai-results.json',JSON.stringify(evidence,null,2));
    console.log(JSON.stringify(evidence));
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    if(pool)await pool.end();if(client)await client.end();await db.stop();
  }
}
