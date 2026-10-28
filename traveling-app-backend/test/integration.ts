import EmbeddedPostgres from 'embedded-postgres';
import { createServer } from 'net';
import { randomUUID,createHmac } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
async function freePort() {
  const s=createServer();await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));
  const port=(s.address() as any).port;await new Promise<void>(r=>s.close(()=>r()));return port;
}
let finalExitCode=0;
async function main() {
  // Always create a NEW local cluster. Never consume DATABASE_URL, Supabase keys or a developer .env.
  if(await fs.stat('.env').then(()=>true,()=>false)) throw new Error('Move .env aside before running isolated tests');
  const runDir=path.resolve('.test-runs',new Date().toISOString().replace(/[:.]/g,'-'));
  await fs.mkdir(runDir,{recursive:true});
  const port=await freePort(),password=randomUUID();
  const db=new EmbeddedPostgres({databaseDir:path.join(runDir,'pgdata'),user:'test_owner',password,port,persistent:true,
    initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  const results:any[]=[];let server:any,owner:any,pool:any;const started=Date.now();
  try {
    await db.initialise();await db.start();
    owner=db.getPgClient('postgres','127.0.0.1');await owner.connect();await owner.query("SET TIME ZONE 'UTC'");
    await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'::jsonb); CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid); CREATE TABLE auth.refresh_tokens(id bigserial PRIMARY KEY,user_id text)");
    await owner.query(await fs.readFile('../database/schema.sql','utf8'));
    const ids={guest:randomUUID(),other:randomUUID(),host:randomUUID(),admin:randomUUID(),blocked:randomUUID()};
    for(const [name,id] of Object.entries(ids))await owner.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)",[id,name+'@example.test',JSON.stringify({full_name:name})]);
    await owner.query("UPDATE public.users SET role='host' WHERE id=$1",[ids.host]);
    await owner.query("UPDATE public.users SET role='admin' WHERE id=$1",[ids.admin]);
    const category=(await owner.query("INSERT INTO categories(name,slug,icon_name) VALUES('Beach','beach','sun') RETURNING id")).rows[0].id;
    const amenities=(await owner.query("INSERT INTO amenities(name,icon_name) VALUES('WiFi','wifi'),('Pool','pool') RETURNING id")).rows.map((r:any)=>r.id);
    async function listing(title='Test Stay') {
      const id=(await owner.query("INSERT INTO listings(host_id,category_id,title,city,country,region,price_per_night,cleaning_fee,service_fee,max_guests,bedrooms,beds,bathrooms) VALUES($1,$2,$3,'Da Nang','Vietnam','Asia',100,20,10,4,2,3,1) RETURNING id",[ids.host,category,title])).rows[0].id;
      for(const a of amenities)await owner.query('INSERT INTO listing_amenities VALUES($1,$2)',[id,a]);
      return id;
    }
    const legacyListing=await listing('Legacy'),mainListing=await listing();
    const legacy=(await owner.query("INSERT INTO bookings(booking_code,guest_id,listing_id,check_in_date,check_out_date,number_of_guests,price_per_night,total_price,booking_status) VALUES('LEGACY',$1,$2,'2001-01-01','2001-01-02',1,100,100,'completed') RETURNING id",[ids.other,legacyListing])).rows[0].id;
    await owner.query("INSERT INTO payments(booking_id,user_id,amount,payment_status) VALUES($1,$2,100,'refunded')",[legacy,ids.other]);
    await owner.query("SET traveling.approve_legacy_mock='yes'");
    for(const f of (await fs.readdir('../database/migrations')).filter(f=>f.endsWith('.sql')).sort())await owner.query(await fs.readFile('../database/migrations/'+f,'utf8'));
    const version=(await owner.query('SELECT version()')).rows[0].version;
    Object.assign(process.env,{NODE_ENV:'test',PAYMENT_MODE:'mock',DATABASE_SSL:'disable',MOCK_WEBHOOK_SECRET:randomUUID(),TAX_RATE:'0',
      SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-placeholder',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:''});
    const url=new URL('postgresql://test_owner:'+password+'@127.0.0.1:'+port+'/postgres');
    url.searchParams.set('options','-c role=traveling_backend -c timezone=UTC');process.env.DATABASE_URL=url.toString();
    pool=(await import('../src/config/database')).pool;
    const {ENV}=await import('../src/config/env');
    const {supabaseAdmin}=await import('../src/config/supabase');
    const {stripe}=await import('../src/services/gateway.service');
    const {bookingRepository}=await import('../src/repositories/booking.repository');
    const {assertTransition,isDate}=await import('../src/domain/booking');
    const jwt=(id:string,iat=Math.floor(Date.now()/1000)+1)=>Buffer.from('{"alg":"TEST"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,iat})).toString('base64url')+'.test';
    const tokens=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,jwt(id)]));
    (supabaseAdmin.auth as any).getUser=async(token:string)=>{
      if(token==='expired')return {data:{user:null},error:{code:'jwt_expired',message:'JWT expired',status:401}};
      const entry=Object.entries(tokens).find(([,t])=>t===token);
      return entry?{data:{user:{id:(ids as any)[entry[0]]}},error:null}:{data:{user:null},error:{code:'bad_jwt',message:'Invalid token',status:401}};
    };
    let authFailure=false;
    (supabaseAdmin.auth.admin as any).updateUserById=async()=>({data:{user:{}},error:authFailure?{message:'stub failure'}:null});
    (supabaseAdmin.auth.admin as any).signOut=async()=>({error:null});
    await owner.query("UPDATE users SET account_status='blocked' WHERE id=$1",[ids.blocked]);
    server=(await import('../src/app')).createApp().listen(0,'127.0.0.1');
    await new Promise<void>(r=>server.on('listening',r));
    const base='http://127.0.0.1:'+server.address().port+'/api/v1';
    async function api(method:string,endpoint:string,who?:string,body?:any,extra:any={}) {
      const response=await fetch(base+endpoint,{method,headers:{...(who?{Authorization:'Bearer '+(tokens[who]||who)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
      const binary=/application\/pdf|spreadsheetml/.test(response.headers.get('content-type')||'');
      return {status:response.status,body:binary?Buffer.from(await response.arrayBuffer()):await response.json(),headers:response.headers};
    }
    const day=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
    const stay=(id=mainListing,offset=10)=>({listingId:id,checkInDate:day(offset),checkOutDate:day(offset+2),guests:2});
    async function check(name:string,fn:()=>Promise<any>) {
      const start=Date.now();
      try{await fn();results.push({name,passed:true,ms:Date.now()-start});console.log('PASS '+name);}
      catch(e:any){results.push({name,passed:false,ms:Date.now()-start,error:e.message});console.error('FAIL '+name+': '+e.stack);}
    }
    async function create(id=mainListing,offset=10,who='guest',more:any={}) {
      const r=await api('POST','/bookings',who,{...stay(id,offset),...more});assert.equal(r.status,201,JSON.stringify(r.body));return r.body.data.booking;
    }
    async function pay(b:any,plan='full',who='guest',outcome='succeeded') {
      const r=await api('POST','/bookings/'+b.id+'/payments',who,{plan},{'Idempotency-Key':randomUUID()});assert.equal(r.status,201,JSON.stringify(r.body));
      const p=r.body.data.payment,paid=await api('POST','/payments/'+p.id+'/simulate',who,{outcome});assert.equal(paid.status,200,JSON.stringify(paid.body));return p;
    }
    const mockEvent=async(p:any,id:string,type='succeeded',amount=Number(p.amount)*100)=>{
      const payload={id,paymentId:p.id,type,amount,currency:'USD'},raw=JSON.stringify(payload),t=Math.floor(Date.now()/1000);
      const sig=createHmac('sha256',ENV.MOCK_WEBHOOK_SECRET).update(t+'.'+raw).digest('hex');
      const res=await fetch(base+'/webhooks/mock',{method:'POST',headers:{'Content-Type':'application/json','X-Webhook-Signature':'t='+t+',v1='+sig},body:raw});
      return {status:res.status,body:await res.json()};
    };

    await check('Migration preserves historical mock payment/refund ledger',async()=>{
      const r=(await owner.query('SELECT p.payment_status,p.provider,r.status,r.amount FROM payments p JOIN refunds r ON r.payment_id=p.id WHERE p.booking_id=$1',[legacy])).rows[0];
      assert.equal(r.payment_status,'succeeded');assert.equal(r.provider,'legacy_mock');assert.equal(r.status,'succeeded');assert.equal(Number(r.amount),100);
    });
    await check('Auth missing/expired/invalid/blocked; non-admin cannot access admin',async()=>{
      for(const [who,status,code] of [[undefined,401,'AUTH_REQUIRED'],['expired',401,'TOKEN_EXPIRED'],['invalid',401,'INVALID_TOKEN'],['blocked',403,'ACCOUNT_BLOCKED']] as const) {
        const r=await api('GET','/auth/me',who);assert.equal(r.status,status);assert.equal(r.body.error.code,code);
      }
      for(const resource of ['session','listings','categories','customers','bookings','refunds','coupons','reports/revenue?from='+day(0)+'&to='+day(0),'audit-logs'])assert.equal((await api('GET','/admin/'+resource,'guest')).status,403);
      assert.equal((await api('GET','/admin/session','admin')).status,200);assert.equal((await api('GET','/listings','blocked')).status,403);
    });
    await check('Booking rejects impossible/past/reversed dates, fractional guests and capacity',async()=>{
      for(const change of [{checkInDate:'2099-02-30'},{checkInDate:day(-1)},{checkOutDate:day(9)},{guests:1.5},{guests:0},{guests:5}])assert.equal((await api('POST','/bookings','guest',{...stay(),...change})).status,400);
      assert.equal(isDate('2100-02-29'),false);assert.equal(isDate('2096-02-29'),true);
    });
    await check('Search validates UUIDs, date pair, min/max and pagination',async()=>{
      for(const q of ['categoryId=bad','amenityIds=bad','checkIn='+day(1),'minPrice=10&maxPrice=1','page=1.5','limit=51','guests=1.5','checkIn=2099-02-30&checkOut=2099-03-03'])assert.equal((await api('GET','/listings?'+q)).status,400,q);
      assert.equal((await api('GET','/bookings/invalid','guest')).status,400);assert.equal((await api('GET','/listings/'+mainListing+'/reviews?page=-1')).status,400);
    });
    await check('Search combines location/type/category/amenities and server trip pricing',async()=>{
      const q='q=Da%20Nang&region=Asia&country=Vietnam&roomType=entire_place&propertyType=Apartment&categoryId='+category+'&minPrice=0&maxPrice=100&guests=4&bedrooms=2&beds=3&bathrooms=1&amenityIds='+amenities.join(',')+'&checkIn='+day(100)+'&checkOut='+day(102)+'&page=1&limit=2';
      const r=await api('GET','/listings?'+q);assert.equal(r.status,200);assert.ok(r.body.pagination.total>=2);assert.equal(r.body.data[0].pricing.tripTotal,230);assert.equal(r.body.data[0].nightly_rate,100);
      assert.equal((await api('GET','/listings?roomType=dormitory')).body.pagination.total,0);
    });
    await check('Two concurrent HTTP bookings: exactly one 201/one 409, no automatic payment',async()=>{
      const responses=await Promise.all([api('POST','/bookings','guest',stay()),api('POST','/bookings','other',stay())]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
      const b=responses.find(r=>r.status===201)!.body.data;assert.equal(b.booking.booking_status,'pending');assert.equal(b.payment,null);
      assert.equal((await owner.query('SELECT count(*)::int n FROM payments WHERE booking_id=$1',[b.booking.id])).rows[0].n,0);
    });
    await check('Database exclusion independently rejects overlapping dates',async()=>{
      await assert.rejects(owner.query("INSERT INTO bookings(booking_code,guest_id,listing_id,check_in_date,check_out_date,number_of_guests,price_per_night,total_price) VALUES($1,$2,$3,$4,$5,1,100,200)",['DIRECT-'+randomUUID().slice(0,8),ids.guest,mainListing,day(10),day(12)]),(e:any)=>e.code==='23P01');
    });
    await check('Back-to-back stays allowed; frontend totals ignored',async()=>{
      const b=await create(mainListing,12,'guest',{totalPrice:0,amount:1});assert.equal(Number(b.total_price),230);assert.equal(Number(b.amount_paid),0);
    });
    let deposit:any,depositPayment:any;
    await check('Deposit $30 then balance; concurrent idempotent initialization; listing no duplicate rows',async()=>{
      deposit=await create(mainListing,20,'guest',{paymentPlan:'deposit'});
      const key=randomUUID(),url='/bookings/'+deposit.id+'/payments';
      const [r1,r2]=await Promise.all([api('POST',url,'guest',{plan:'deposit'},{'Idempotency-Key':key}),api('POST',url,'guest',{plan:'deposit'},{'Idempotency-Key':key})]);
      assert.equal(r1.status,201);assert.equal(r2.status,201);assert.equal(r1.body.data.payment.id,r2.body.data.payment.id);
      depositPayment=r1.body.data.payment;assert.equal(Number(depositPayment.amount),30);
      assert.equal((await api('POST','/payments/'+depositPayment.id+'/simulate','guest',{outcome:'succeeded'})).status,200);
      let d=(await api('GET','/bookings/'+deposit.id,'guest')).body.data;assert.equal(d.booking_status,'confirmed');assert.equal(Number(d.amount_paid),30);assert.equal(Number(d.balance_due),200);
      await pay(deposit,'balance');d=(await api('GET','/bookings/'+deposit.id,'guest')).body.data;
      assert.equal(d.payments.length,2);assert.equal(Number(d.amount_paid),230);assert.equal(Number(d.balance_due),0);
      assert.equal((await api('GET','/bookings?limit=50','guest')).body.data.filter((x:any)=>x.id===deposit.id).length,1);
      assert.equal((await api('POST',url,'guest',{plan:'full'},{'Idempotency-Key':key})).status,409);
    });
    await check('Ownership blocks booking, payment, refund and PDF access by other users',async()=>{
      for(const [method,url,body] of [['GET','/bookings/'+deposit.id,undefined],['PATCH','/bookings/'+deposit.id+'/cancel',{}],['POST','/bookings/'+deposit.id+'/refunds',{reason:'request'}],['GET','/payments/'+deposit.id+'/receipt',undefined],['POST','/payments/'+depositPayment.id+'/simulate',{outcome:'succeeded'}]])assert.equal((await api(method as string,url as string,'other',body)).status,404);
      assert.equal((await api('POST','/bookings/'+deposit.id+'/payments','other',{plan:'full'},{'Idempotency-Key':randomUUID()})).status,404);
    });
    await check('Review denied before completed at server and database',async()=>{
      assert.equal((await api('POST','/listings/'+mainListing+'/reviews','guest',{rating:5,comment:'Great stay'})).body.error.code,'REVIEW_NOT_ELIGIBLE');
      await assert.rejects(owner.query('INSERT INTO reviews(listing_id,user_id,rating,comment) VALUES($1,$2,5,$3)',[mainListing,ids.guest,'Bypass attempt']),(e:any)=>e.constraint==='review_completed_booking');
    });
    await check('Complete after checkout; concurrent duplicate reviews; completed cancellation refused',async()=>{
      assert.equal((await api('PATCH','/admin/bookings/'+deposit.id+'/complete','admin')).body.error.code,'STAY_NOT_ENDED');
      await owner.query('UPDATE bookings SET check_in_date=$2,check_out_date=$3 WHERE id=$1',[deposit.id,day(-2),day(0)]);
      assert.equal((await api('PATCH','/admin/bookings/'+deposit.id+'/complete','admin')).status,200);
      const r=await Promise.all([api('POST','/listings/'+mainListing+'/reviews','guest',{rating:5,comment:'Great stay'}),api('POST','/listings/'+mainListing+'/reviews','guest',{rating:4,comment:'Great place'})]);assert.deepEqual(r.map(x=>x.status).sort(),[201,409]);
      assert.equal((await api('PATCH','/bookings/'+deposit.id+'/cancel','guest',{})).status,409);assert.equal((await api('POST','/bookings/'+deposit.id+'/refunds','guest',{reason:'invalid refund'})).status,409);
      assert.equal((await api('GET','/listings/'+mainListing+'/reviews')).body.pagination.total,1);
    });
    await check('Receipt after completed streams PDF with private no-store cache',async()=>{
      const r=await api('GET','/payments/'+deposit.id+'/receipt','guest');assert.equal(r.status,200);assert.ok(r.body.subarray(0,5).equals(Buffer.from('%PDF-')));assert.equal(r.headers.get('cache-control'),'private, no-store');await fs.writeFile(path.join(runDir,'receipt.pdf'),r.body);
    });
    let cancelled:any,refundId:string;
    await check('Cancellation creates requested refund; cannot process before admin approval',async()=>{
      cancelled=await create(mainListing,30);await pay(cancelled);
      const r=await api('PATCH','/bookings/'+cancelled.id+'/cancel','guest',{reason:'Plans changed'});assert.equal(r.status,200);refundId=r.body.data.refunds[0].id;assert.equal(r.body.data.refunds[0].status,'requested');
      assert.equal((await api('POST','/admin/refunds/'+refundId+'/process','admin')).status,409);assert.equal((await api('GET','/payments/'+cancelled.id+'/receipt','guest')).status,200);
      assert.equal((await api('GET','/bookings/'+cancelled.id,'guest')).body.data.payments[0].payment_status,'succeeded');
    });
    await check('Admin approval and mock refund succeed once; repeated processing refused',async()=>{
      assert.equal((await api('PATCH','/admin/refunds/'+refundId+'/decision','admin',{decision:'approve',reason:'Eligible cancellation'})).status,200);
      assert.equal((await api('POST','/admin/refunds/'+refundId+'/process','admin')).status,200);assert.equal((await api('POST','/admin/refunds/'+refundId+'/process','admin')).status,409);
      const d=(await api('GET','/bookings/'+cancelled.id,'guest')).body.data;assert.equal(d.payment_status,'refunded');assert.equal(Number(d.amount_refunded),230);
    });
    await check('Invalid terminal booking/payment/refund transitions refused',async()=>{
      for(const [kind,from,to] of [['booking','completed','cancelled'],['payment','succeeded','failed'],['refund','requested','succeeded']])assert.throws(()=>assertTransition(kind as any,from,to));
    });

    await check('Verified webhook replay atomic under concurrent delivery',async()=>{
      const b=await create(mainListing,40);
      const p=(await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'full'},{'Idempotency-Key':randomUUID()})).body.data.payment;
      const r=await Promise.all([mockEvent(p,'event-replay'),mockEvent(p,'event-replay')]);assert.ok(r.every(x=>x.status===200));assert.equal(r.filter(x=>x.body.data.duplicate).length,1);
      assert.equal((await owner.query("SELECT count(*)::int n FROM webhook_events WHERE event_id='event-replay'")).rows[0].n,1);
      assert.equal((await api('GET','/bookings/'+b.id,'guest')).body.data.booking_status,'confirmed');assert.equal((await mockEvent(p,'event-replay','failed')).status,409);
    });
    await check('Webhook signature and amount mismatches refused without ledger mutation',async()=>{
      const b=await create(mainListing,50);
      const p=(await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'full'},{'Idempotency-Key':randomUUID()})).body.data.payment;
      assert.equal((await fetch(base+'/webhooks/mock',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
      assert.equal((await mockEvent(p,'amount-mismatch','succeeded',1)).status,409);
      assert.equal((await owner.query('SELECT payment_status FROM payments WHERE id=$1',[p.id])).rows[0].payment_status,'pending');assert.equal((await mockEvent(p,'amount-mismatch')).status,200);
    });
    await check('Failed and timed-out payment attempts remain unpaid; new attempt can succeed',async()=>{
      const b=await create(mainListing,60);await pay(b,'full','guest','failed');await pay(b,'full','guest','timed_out');
      const d=(await api('GET','/bookings/'+b.id,'guest')).body.data;assert.equal(Number(d.amount_paid),0);assert.equal(d.booking_status,'pending');
      await pay(b);assert.equal((await api('GET','/bookings/'+b.id,'guest')).body.data.booking_status,'confirmed');
    });
    await check('Expired hold released; late success requests refund without resurrecting booking',async()=>{
      const b=await create(mainListing,70);
      const p=(await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'full'},{'Idempotency-Key':randomUUID()})).body.data.payment;
      await owner.query("UPDATE bookings SET payment_due_at=now()-interval '1 minute' WHERE id=$1",[b.id]);assert.ok((await bookingRepository.expirePending()).expired>=1);
      await create(mainListing,70,'other');assert.equal((await mockEvent(p,'late-event')).status,200);
      const d=(await api('GET','/bookings/'+b.id,'guest')).body.data;assert.equal(d.booking_status,'expired');assert.equal(d.refunds[0].status,'requested');
    });
    await check('Coupon global quota serialized across different accommodations',async()=>{
      const l1=await listing('Coupon 1'),l2=await listing('Coupon 2');
      const c=await api('POST','/admin/coupons','admin',{code:'ONE',discountPercent:10,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),maxUses:1,perUserLimit:2});assert.equal(c.status,201);
      const r=await Promise.all([api('POST','/bookings','guest',{...stay(l1,10),couponCode:'ONE'}),api('POST','/bookings','other',{...stay(l2,10),couponCode:'ONE'})]);
      assert.deepEqual(r.map(x=>x.status).sort(),[201,409]);assert.equal(Number(r.find(x=>x.status===201)!.body.data.booking.total_price),210);assert.equal((await owner.query("SELECT used_count FROM coupons WHERE code='ONE'")).rows[0].used_count,1);
    });
    await check('Coupon applicability/per-user limits; merged PATCH validation',async()=>{
      const c=await api('POST','/admin/coupons','admin',{code:'LIMIT',discountPercent:50,maxDiscount:15,minSubtotal:100,listingId:mainListing,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),maxUses:5});assert.equal(c.status,201);
      const b=await create(mainListing,80,'guest',{couponCode:'LIMIT'});assert.equal(Number(b.total_price),215);
      assert.equal((await api('POST','/bookings','guest',{...stay(mainListing,82),couponCode:'LIMIT'})).body.error.code,'COUPON_USER_LIMIT');
      assert.equal((await api('PATCH','/admin/coupons/'+c.body.data.id,'admin',{endsAt:'2000-01-01T00:00:00Z'})).status,400);
      await api('DELETE','/admin/coupons/'+c.body.data.id,'admin');assert.equal((await api('POST','/bookings/quote','other',{...stay(mainListing,84),couponCode:'LIMIT'})).body.error.code,'COUPON_NOT_APPLICABLE');
    });
    await check('Favorites isolate owners; concurrent toggles serialize',async()=>{
      assert.ok((await Promise.all([api('POST','/favorites/toggle','guest',{listingId:mainListing}),api('POST','/favorites/toggle','guest',{listingId:mainListing})])).every(r=>r.status===200));
      await api('POST','/favorites/toggle','guest',{listingId:mainListing});assert.equal((await api('GET','/favorites','guest')).body.pagination.total,1);assert.equal((await api('GET','/favorites','other')).body.pagination.total,0);
    });
    await check('Admin CRUD, soft hide, category linkage and audit trail',async()=>{
      const c=await api('POST','/admin/categories','admin',{name:'City','slug':'city','iconName':'city'});assert.equal(c.status,201);
      const l=await api('POST','/admin/listings','admin',{hostId:ids.host,categoryId:c.body.data.id,title:'Admin Stay',propertyType:'Villa',roomType:'private_room',city:'Hue',country:'Vietnam',region:'Asia',pricePerNight:90,maxGuests:2,bedrooms:1,beds:1,bathrooms:1,amenityIds:amenities,photos:[{photoUrl:'https://example.test/photo.jpg',isCover:true}]});assert.equal(l.status,201,JSON.stringify(l.body));
      assert.equal((await api('DELETE','/admin/categories/'+c.body.data.id,'admin')).body.error.code,'CATEGORY_IN_USE');
      assert.equal((await api('PATCH','/admin/listings/'+l.body.data.id,'admin',{title:'Updated Stay'})).status,200);
      assert.equal((await api('DELETE','/admin/listings/'+l.body.data.id,'admin')).status,200);assert.equal((await api('GET','/listings/'+l.body.data.id)).status,404);assert.ok((await api('GET','/admin/audit-logs','admin')).body.pagination.total>=5);
    });
    await check('Account blocking revokes refresh sessions and old JWTs; failed auth sync retry',async()=>{
      await owner.query('INSERT INTO auth.sessions VALUES($1,$2)',[randomUUID(),ids.other]);await owner.query('INSERT INTO auth.refresh_tokens(user_id) VALUES($1)',[ids.other]);
      authFailure=true;
      const r=await api('PATCH','/admin/customers/'+ids.other+'/status','admin',{status:'blocked',reason:'Test violation'});assert.equal(r.status,202);assert.equal(r.body.data.auth_sync_pending,true);assert.equal((await api('GET','/auth/me','other')).body.error.code,'ACCOUNT_BLOCKED');
      authFailure=false;assert.equal((await api('POST','/admin/customers/'+ids.other+'/auth-sync','admin')).status,200);
      assert.equal((await owner.query('SELECT count(*)::int n FROM auth.sessions WHERE user_id=$1',[ids.other])).rows[0].n,0);assert.equal((await owner.query('SELECT count(*)::int n FROM auth.refresh_tokens WHERE user_id=$1',[ids.other])).rows[0].n,0);
      tokens.other=jwt(ids.other,Math.floor(Date.now()/1000)-60);
      assert.equal((await api('PATCH','/admin/customers/'+ids.other+'/status','admin',{status:'active',reason:'Test resolved'})).status,200);assert.equal((await api('GET','/auth/me','other')).body.error.code,'SESSION_REVOKED');tokens.other=jwt(ids.other);
    });
    await check('RLS denies direct business reads/writes/role edits; runtime audit is append-only',async()=>{
      await owner.query('BEGIN');try{await owner.query('SET LOCAL ROLE authenticated');await assert.rejects(owner.query('SELECT * FROM public.bookings'),(e:any)=>e.code==='42501');}finally{await owner.query('ROLLBACK');}
      await owner.query('BEGIN');try{await owner.query('SET LOCAL ROLE anon');assert.ok((await owner.query('SELECT * FROM public.listings')).rows.length);await assert.rejects(owner.query("UPDATE public.users SET role='admin'"),(e:any)=>e.code==='42501');}finally{await owner.query('ROLLBACK');}
      await assert.rejects(pool.query('DELETE FROM admin_audit_logs'),(e:any)=>e.code==='42501');
    });

    await check('Stripe test adapter and signed callbacks (SDK mocked; no provider network)',async()=>{
      const originalCreate=stripe.paymentIntents.create,originalRefund=stripe.refunds.create;
      ENV.PAYMENT_MODE='stripe_test';ENV.STRIPE_WEBHOOK_SECRET='whsec_'+randomUUID();let request:any,options:any;
      (stripe.paymentIntents as any).create=async(data:any,opts:any)=>{request=data;options=opts;return {id:'pi_fixture',amount:data.amount,currency:'usd',livemode:false,client_secret:'test_client_secret'};};
      (stripe.refunds as any).create=async()=>({id:'re_fixture',status:'pending'});
      const send=async(event:any)=>{
        const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:ENV.STRIPE_WEBHOOK_SECRET});
        const r=await fetch(base+'/webhooks/stripe_test',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature},body:payload});return {status:r.status,body:await r.json()};
      };
      try{
        const b=await create(mainListing,90),payment=(await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'full'},{'Idempotency-Key':randomUUID()})).body.data;
        assert.equal(request.amount,23000);assert.deepEqual(request.allowed_payment_method_types,['card']);assert.ok(options.idempotencyKey.startsWith('payment:'));assert.equal(payment.clientSecret,'test_client_secret');
        const p=payment.payment;
        assert.equal((await send({id:'evt_test_success',type:'payment_intent.succeeded',livemode:false,data:{object:{id:'pi_fixture',livemode:false,amount_received:23000,currency:'usd',metadata:{paymentId:p.id}}}})).status,200);
        assert.equal((await api('GET','/bookings/'+b.id,'guest')).body.data.booking_status,'confirmed');
        const r=(await api('PATCH','/bookings/'+b.id+'/cancel','guest',{})).body.data.refunds[0];
        await api('PATCH','/admin/refunds/'+r.id+'/decision','admin',{decision:'approve',reason:'Approved test refund'});
        assert.equal((await api('POST','/admin/refunds/'+r.id+'/process','admin')).body.data.status,'processing');
        assert.equal((await send({id:'evt_refund_failed',type:'refund.failed',livemode:false,data:{object:{id:'re_fixture',livemode:false,amount:23000,currency:'usd',status:'failed',payment_intent:'pi_fixture',metadata:{refundId:r.id}}}})).status,200);
        assert.equal(Number((await api('GET','/bookings/'+b.id,'guest')).body.data.amount_refunded),0);
        assert.equal((await send({id:'evt_live_refused',type:'payment_intent.succeeded',livemode:true,data:{object:{}}})).status,400);
        assert.equal((await send({id:'evt_refund_success',type:'refund.updated',livemode:false,data:{object:{id:'re_fixture',livemode:false,amount:23000,currency:'usd',status:'succeeded',payment_intent:'pi_fixture',metadata:{refundId:r.id}}}})).status,200);
        assert.equal((await api('GET','/bookings/'+b.id,'guest')).body.data.payment_status,'refunded');assert.equal((await api('POST','/payments/'+p.id+'/simulate','guest',{outcome:'succeeded'})).status,404);
      }finally{ENV.PAYMENT_MODE='mock';stripe.paymentIntents.create=originalCreate;stripe.refunds.create=originalRefund;}
    });
    await check('Revenue from succeeded transactions/refunds; exported Excel parses',async()=>{
      const r=await api('GET','/admin/reports/revenue?from='+day(0)+'&to='+day(0),'admin');assert.equal(r.status,200);
      const expected=(await owner.query("SELECT (SELECT sum(amount) FROM payments WHERE payment_status='succeeded' AND coalesce(paid_at,created_at)>=current_date) gross,(SELECT sum(amount) FROM refunds WHERE status='succeeded' AND succeeded_at>=current_date) refunded")).rows[0];
      assert.equal(Number(r.body.data.gross_payments),Number(expected.gross));assert.equal(Number(r.body.data.refunds),Number(expected.refunded));
      const x=await api('GET','/admin/reports/revenue.xlsx?from='+day(0)+'&to='+day(0),'admin');assert.equal(x.status,200);
      const {default:ExcelJS}=await import('exceljs');const w=new ExcelJS.Workbook();await w.xlsx.load(x.body as any);assert.ok(w.worksheets[0].rowCount>1);await fs.writeFile(path.join(runDir,'revenue.xlsx'),x.body);
    });
    await check('Disabled provider refuses payment; no automatic succeeded row',async()=>{
      const b=await create(mainListing,110);ENV.PAYMENT_MODE='disabled';
      try{const r=await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'full'},{'Idempotency-Key':randomUUID()});assert.equal(r.status,503);assert.equal(r.body.error.code,'PAYMENTS_DISABLED');}finally{ENV.PAYMENT_MODE='mock';}
      assert.equal((await owner.query('SELECT count(*)::int n FROM payments WHERE booking_id=$1',[b.id])).rows[0].n,0);
    });

    await check('Admin cannot confirm unpaid booking; database refuses premature/terminal transitions',async()=>{
      const b=await create(mainListing,130);
      assert.equal((await api('PATCH','/admin/bookings/'+b.id+'/confirm','admin')).body.error.code,'PAYMENT_REQUIRED');
      await assert.rejects(owner.query("UPDATE bookings SET booking_status='confirmed' WHERE id=$1",[b.id]),(e:any)=>e.code==='23514');
      await assert.rejects(owner.query("UPDATE bookings SET booking_status='cancelled' WHERE id=$1",[deposit.id]),(e:any)=>e.code==='23514');
      await assert.rejects(owner.query("UPDATE payments SET amount=1 WHERE id=$1",[depositPayment.id]),(e:any)=>e.code==='23514');
    });
    await check('Confirmed deposit survives balance timeout; unpaid completion and late cancellation refused',async()=>{
      const b=await create(mainListing,140,'guest',{paymentPlan:'deposit'});await pay(b,'deposit');
      const p=(await api('POST','/bookings/'+b.id+'/payments','guest',{plan:'balance'},{'Idempotency-Key':randomUUID()})).body.data.payment;
      await owner.query("UPDATE payments SET expires_at=now()-interval '1 minute' WHERE id=$1",[p.id]);
      assert.ok((await bookingRepository.expirePending()).paymentsTimedOut>=1);
      assert.equal((await api('GET','/bookings/'+b.id,'guest')).body.data.booking_status,'confirmed');
      await owner.query('UPDATE bookings SET check_in_date=$2,check_out_date=$3 WHERE id=$1',[b.id,day(-4),day(-2)]);
      assert.equal((await api('PATCH','/admin/bookings/'+b.id+'/complete','admin')).body.error.code,'PAYMENT_REQUIRED');
      assert.equal((await api('PATCH','/bookings/'+b.id+'/cancel','guest',{})).body.error.code,'CANCELLATION_WINDOW_CLOSED');
    });
    await check('Expired coupon and minimum subtotal rejected; admin can search coupon status',async()=>{
      const c=await api('POST','/admin/coupons','admin',{code:'EXPIRED',discountPercent:10,startsAt:new Date(Date.now()-172800000).toISOString(),endsAt:new Date(Date.now()-86400000).toISOString(),maxUses:2});
      assert.equal(c.status,201);
      assert.equal((await api('POST','/bookings/quote','guest',{...stay(mainListing,150),couponCode:'EXPIRED'})).body.error.code,'COUPON_NOT_APPLICABLE');
      assert.equal((await api('GET','/admin/coupons?status=expired','admin')).body.data.some((x:any)=>x.id===c.body.data.id),true);
      const patched=await api('PATCH','/admin/coupons/'+c.body.data.id,'admin',{endsAt:new Date(Date.now()+86400000).toISOString(),minSubtotal:500});assert.equal(patched.status,200);
      assert.equal((await api('POST','/bookings/quote','guest',{...stay(mainListing,150),couponCode:'EXPIRED'})).body.error.code,'COUPON_NOT_APPLICABLE');
    });
    await check('Configured tax priced on server and snapshotted; client tax ignored',async()=>{
      ENV.TAX_RATE=0.1;
      try{
        const q=await api('POST','/bookings/quote','guest',stay(mainListing,160));assert.equal(q.body.data.taxAmount,23);assert.equal(q.body.data.tripTotal,253);
        const b=await create(mainListing,160,'guest',{taxAmount:0,totalPrice:1});assert.equal(Number(b.tax_amount),23);assert.equal(Number(b.total_price),253);
      }finally{ENV.TAX_RATE=0;}
    });
    await check('OpenAPI covers every actual route; Postman operation count and empty token templates',async()=>{
      const spec=JSON.parse(await fs.readFile('../docs/openapi.json','utf8'));
      const actual=new Set<string>(['GET /health','GET /api/v1/health','POST /api/v1/webhooks/mock','POST /api/v1/webhooks/stripe_test']);
      for(const [file,prefix]of [['auth.routes','/auth'],['booking.routes',''],['discovery.routes',''],['interaction.routes',''],['admin.routes','/admin']]){
        const router=(await import('../src/routes/'+file)).default;
        for(const layer of router.stack)if(layer.route)for(const [method,on]of Object.entries(layer.route.methods))if(on)actual.add(method.toUpperCase()+' /api/v1'+prefix+layer.route.path.replace(/:([A-Za-z]+)/g,'{$1}'));
      }
      const documented=new Set<string>();
      for(const [url,methods]of Object.entries<any>(spec.paths))for(const method of Object.keys(methods))documented.add(method.toUpperCase()+' '+url);
      assert.deepEqual([...actual].sort(),[...documented].sort());
      const collection=JSON.parse(await fs.readFile('../docs/postman.collection.json','utf8'));
      assert.equal(collection.item.flatMap((g:any)=>g.item).length,actual.size);
      const env=JSON.parse(await fs.readFile('../docs/postman.environment.json','utf8'));
      for(const v of env.values)if(/Token|Signature/.test(v.key))assert.equal(v.value,'');
      assert.equal((await api('DELETE','/admin/listings/'+mainListing,'guest')).status,403);
    });
    const evidence={startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),postgres:version,database:'new isolated local PostgreSQL; no live database used',auth:'Supabase methods mocked in test process only',stripe:'SDK requests mocked; genuine SDK HMAC verification exercised; no Stripe account transaction',passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
    await fs.writeFile(path.resolve('../docs/test-results.json'),JSON.stringify(evidence,null,2));
    console.log(JSON.stringify({passed:evidence.passed,failed:evidence.failed,evidence:'docs/test-results.json',runDir}));
    if(evidence.failed)finalExitCode=1;
  }finally{
    if(server)await new Promise<void>(r=>server.close(()=>r()));if(pool)await pool.end();if(owner)await owner.end();await db.stop().catch(()=>{});
  }
}
main().then(()=>{process.exitCode=finalExitCode;}).catch(e=>{console.error(e);process.exitCode=1;});
