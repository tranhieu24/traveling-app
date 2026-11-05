const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function load(relative,stubs={}) {
  const file=path.resolve(__dirname,'..',relative),mod=new Module(file,module);
  mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
  const original=mod.require.bind(mod);mod.require=name=>{
    if(name.endsWith('/preferences/ui'))return {useUiPreferences(){},uiText:value=>value,uiStyle:value=>value,uiTextStyle:value=>value,uiClasses:value=>value,uiColor:value=>value,uiLocale:()=>'vi-VN'};
    if(name.endsWith('/navigation/authReturn'))return load('src/navigation/authReturn.ts',{'react-native':{Platform:{OS:'android'}}});
    return Object.hasOwn(stubs,name)?stubs[name]:original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);
  return mod.exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
for(const role of ['guest','admin']) test(`OAuth callback shares work across effect remount and routes ${role} correctly`,async()=>{
  let calls=0,resolve;const completion=new Promise(r=>resolve=r),effects=[],resets=[];
  const React={createElement:(type,props,...children)=>({type,props,children}),useState:v=>[v,()=>{}],useRef:current=>({current}),useEffect:fn=>effects.push(fn)};
  const {AuthCallbackScreen}=load('src/screens/AuthCallbackScreen.tsx',{
    react:{__esModule:true,default:React,...React},'react-native':{Platform:{OS:'android'},StyleSheet:{create:v=>v}},
    'react-native-safe-area-context':{},'expo-linking':{getInitialURL:async()=>null},
    '@react-navigation/native':{useNavigation:()=>({reset:v=>resets.push(v)})},
    '../context/AuthContext':{useAuth:()=>({completeSocialSignIn:()=>{calls++;return completion;}})},
    '../config/auth':{getCapturedAuthCallback:()=> 'travelingapp://auth/callback?code=fixture',safeAuthError:e=>e}
  });
  AuthCallbackScreen();const cleanup=effects[0]();cleanup();effects[0]();
  resolve({id:'user',role});await tick();
  assert.equal(calls,1);assert.equal(resets.length,1);assert.equal(resets[0].routes[0].name,role==='admin'?'AdminPortal':'MainTabs');
});
function stripeFixture({status='pending',balance=200,bookingStatus='confirmed'}={}) {
  const keys=new Map(),requests=[];
  const service=load('src/services/stripeCheckout.ts',{
    './apiClient':{apiClient:{post:async(url,body,options)=>{requests.push(options.headers['Idempotency-Key']);return {data:{success:true,data:{payment:{id:'p',booking_id:'b',provider:'stripe_test',payment_status:status},clientSecret:'fixture-secret'}}};},get:async()=>({data:{success:true,data:{id:'b',booking_status:bookingStatus,balance_due:balance,payments:[{id:'p',provider:'stripe_test',payment_status:status}]}}})}},
    '../utils/storage':{storage:{getItem:async k=>keys.get(k),setItem:async(k,v)=>keys.set(k,v),removeItem:async k=>keys.delete(k)}}
  });return {service,keys,requests};
}
test('Stripe retry retains idempotency key until attempt terminal',async()=>{
  const f=stripeFixture();await f.service.prepareStripeCheckout('b','deposit');await f.service.prepareStripeCheckout('b','deposit');assert.equal(f.requests[0],f.requests[1]);
});
test('Stripe terminal attempt clears retry key and does not confirm booking',async()=>{
  const f=stripeFixture({status:'failed'});await assert.rejects(f.service.prepareStripeCheckout('b','full'),/thử lại/);assert.equal(f.keys.size,0);
});
test('An expired Stripe replay releases its key only when the server confirms expiry',async()=>{
  const keys=new Map(); let serverTime='2000-01-01T00:00:00Z';
  const {prepareStripeCheckout}=load('src/services/stripeCheckout.ts',{
    './apiClient':{apiClient:{post:async()=>({data:{success:true,serverTime,data:{payment:{id:'p',booking_id:'b',provider:'stripe_test',payment_status:'pending',expires_at:'2000-01-02T00:00:00Z'},clientSecret:null}}})}},
    '../utils/storage':{storage:{getItem:async k=>keys.get(k),setItem:async(k,v)=>keys.set(k,v),removeItem:async k=>keys.delete(k)}}
  });
  await assert.rejects(prepareStripeCheckout('b','full'),/trạng thái/);
  assert.equal(keys.size,1,'Device clock must not expire a server-valid attempt');
  serverTime='2000-01-03T00:00:00Z';
  await assert.rejects(prepareStripeCheckout('b','full'),/hết hạn/);
  assert.equal(keys.size,0);
});
test('SDK completion without verified payment never produces success',async()=>{
  assert.equal(await stripeFixture().service.verifyStripeCheckout('b','p','deposit',1),null);
});
test('Prior deposit cannot be mistaken for successful balance payment',async()=>{
  const f=stripeFixture({status:'succeeded',balance:200});assert.equal(await f.service.verifyStripeCheckout('b',undefined,'balance',1),null);assert.ok(await f.service.verifyStripeCheckout('b','p','deposit',1));
});
test('Fully paid confirmed booking is accepted, late settlement on expired booking is not',async()=>{
  assert.ok(await stripeFixture({status:'succeeded',balance:0}).service.verifyStripeCheckout('b','p','full',1));
  await assert.rejects(stripeFixture({status:'succeeded',balance:0,bookingStatus:'expired'}).service.verifyStripeCheckout('b','p','full',1),/hết hạn/);
});
test('Review page reads only the requested page; summary is a separate request',async()=>{
  const calls=[];
  const service=load('src/services/listingDetail.ts',{'./apiClient':{apiClient:{get:async(url,options)=>{calls.push([url,options]);return url.endsWith('review-summary')?{data:{success:true,data:{total:100,average:4.5,counts:[0,0,0,50,50]}}}:{data:{success:true,data:[{id:'r'}],pagination:{total:100,totalPages:9}}};}}}});
  const page=await service.fetchReviewPage('listing',1,12);assert.equal(page.reviews.length,1);assert.equal(calls.length,1);assert.equal(calls[0][1].params.limit,12);
  const summary=await service.fetchReviewSummary('listing');assert.equal(summary.total,100);assert.equal(calls.length,2);
});
test('An embedded webview is rejected before OAuth redirects away',()=>{
  const previous=global.window;global.window={self:{},top:{},location:{origin:'http://localhost:8082'}};
  try {
    const auth=load('src/config/auth.ts',{'expo-constants':{__esModule:true,default:{expoConfig:{scheme:'travelingapp'}}},'react-native':{Platform:{OS:'web'}}});
    assert.throws(auth.getAuthRedirectUri,/trực tiếp/);
    global.window.top=global.window.self;
    assert.equal(auth.getAuthRedirectUri(),'http://localhost:8082/auth/callback');
  } finally {if(previous===undefined)delete global.window;else global.window=previous;}
});
test('A successful transaction on a still pending booking is not reported as booking success',()=>{
  const {getPaymentSummary}=load('src/utils/paymentSummary.ts');
  const booking={id:'b',booking_code:'TRV',booking_status:'pending',payment_status:'partially_paid',total_price:200,balance_due:170,payments:[{id:'p',amount:30,payment_status:'succeeded',provider:'mock'}]};
  assert.equal(getPaymentSummary(booking).state,'pending');
  assert.equal(getPaymentSummary({...booking,booking_status:'confirmed'}).state,'success');
});
test('An elapsed initial hold never blocks the balance on an already confirmed booking',()=>{
  for(const [status,expected] of [['pending',true],['expired',true],['confirmed',false],['completed',false]]) {
    const effects=[],elapsed=[];
    const React={createElement:()=>null,useState:()=>[0,()=>{}],useRef:current=>({current}),useEffect:fn=>effects.push(fn)};
    const {BookingHold}=load('src/components/booking/BookingHold.tsx',{
      react:{__esModule:true,default:React,...React},'react-native':{StyleSheet:{create:v=>v}},'../../theme/tokens':{theme:{colors:{},radius:{}}}
    });
    BookingHold({booking:{booking_status:status,payment_due_at:'2000-01-01T00:00:00Z'},onElapsed:v=>elapsed.push(v)});
    effects[1]();assert.deepEqual(elapsed,[expected],status);
  }
});
test('Mock full payment after a deposit collects the remaining balance and verifies server state',async()=>{
  const before={id:'b',booking_status:'confirmed',payment_plan:'deposit',payment_status:'partially_paid',total_price:200,amount_paid:30,balance_due:170,server_time:'2000-01-01T00:00:00Z',payments:[{id:'deposit',amount:30,payment_status:'succeeded',provider:'mock'}]};
  const payment={id:'balance',booking_id:'b',requested_plan:'full',payment_status:'pending',provider:'mock',is_simulated:true,expires_at:'2000-01-02T00:00:00Z'};
  let settled=false;const calls=[],keys=new Map();
  const {completeBookingPayment}=load('src/services/bookingPayment.ts',{
    './apiClient':{apiClient:{
      get:async()=>({data:{success:true,data:settled?{...before,amount_paid:200,balance_due:0,payment_status:'paid',payments:[...before.payments,{...payment,payment_status:'succeeded'}]}:before}}),
      post:async(url,body)=>{calls.push([url,body]);if(url.endsWith('/simulate')){settled=true;return {data:{success:true}};}return {data:{success:true,serverTime:before.server_time,data:{payment,simulation:true}}};}
    }},
    '../utils/storage':{storage:{getItem:async k=>keys.get(k),setItem:async(k,v)=>keys.set(k,v),removeItem:async k=>keys.delete(k)}},
    '../utils/paymentSummary':load('src/utils/paymentSummary.ts')
  });
  const result=await completeBookingPayment('b','full');
  assert.equal(calls.length,2);assert.equal(calls[0][1].plan,'full');
  assert.equal(result.balance_due,0);assert.equal(keys.size,0);
});
