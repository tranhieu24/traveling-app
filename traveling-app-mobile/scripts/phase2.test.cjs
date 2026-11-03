const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(relative,stubs={}){const file=path.resolve(__dirname,'..',relative),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));const req=m.require.bind(m);m.require=n=>Object.hasOwn(stubs,n)?stubs[n]:req(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);return m.exports;}
const config=load('src/config/auth.ts',{'expo-constants':{__esModule:true,default:{expoConfig:{scheme:'travelingapp'}}},'react-native':{Platform:{OS:'android'}}});
function fixture(overrides={}){
  const calls=[];const auth={resetPasswordForEmail:async(...a)=>{calls.push(['request',...a]);return {error:null};},exchangeCodeForSession:async(...a)=>{calls.push(['exchange',...a]);return {data:{session:{user:{id:'u'}},redirectType:'recovery'},error:null};},getUser:async()=>({data:{user:{id:'u'}},error:null}),updateUser:async(...a)=>{calls.push(['update',...a]);return {error:null};},signOut:async()=>({error:null}),...overrides};
  return {calls,service:load('src/services/passwordRecovery.ts',{'../config/auth':config}).createPasswordRecovery(auth)};
}
test('Recovery request uses a separate allowlisted callback and gives no account-existence result',async()=>{
  const f=fixture();const result=await f.service.request('a@example.test');assert.match(result,/Nếu email/);assert.equal(f.calls[0][2].redirectTo,'travelingapp://auth/reset-password');
  assert.equal(await fixture({resetPasswordForEmail:async()=>({error:{code:'user_not_found',message:'private detail'}})}).service.request('a@example.test'),result);
});
test('Expired recovery errors never echo provider details',async()=>{
  const f=fixture({exchangeCodeForSession:async()=>{throw new Error('token=secret');}});
  for(let i=0;i<2;i++)await assert.rejects(f.service.open('travelingapp://auth/reset-password?code=x'),e=>/hết hạn/.test(e.message)&&!e.message.includes('secret'));
});
test('Recovery rejects foreign destination, missing code and normal login sessions',async()=>{
  const f=fixture();await assert.rejects(f.service.open('https://evil.test/auth/reset-password?code=x'));await assert.rejects(f.service.open('travelingapp://auth/reset-password'));assert.equal(f.calls.length,0);
  await assert.rejects(fixture({exchangeCodeForSession:async()=>({data:{session:{user:{id:'u'}},redirectType:null},error:null})}).service.open('travelingapp://auth/reset-password?code=x'));
});
test('Recovery exchanges once across remount, forwards PKCE flowId, updates only recovered user',async()=>{
  const f=fixture(),url='travelingapp://auth/reset-password?code=fixture&sb_flow_id=flow';await Promise.all([f.service.open(url),f.service.open(url)]);assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].slice(1),['fixture',{flowId:'flow'}]);
  assert.deepEqual(await f.service.update('new-password-123'),{signedOut:true});assert.equal(f.calls.filter(c=>c[0]==='update').length,1);await assert.rejects(f.service.update('new-password-456'));
});
test('Recovery cannot update without proof or after the active account changes',async()=>{
  const f=fixture({getUser:async()=>({data:{user:{id:'other'}},error:null})});await assert.rejects(f.service.update('password123'));await f.service.open('travelingapp://auth/reset-password?code=x');await assert.rejects(f.service.update('password123'));assert.equal(f.calls.filter(c=>c[0]==='update').length,0);
});
test('Recovery navigation strips code and tokens and captures the URL only in memory',async()=>{
  const links=load('src/navigation/linking.ts',{'@react-navigation/native':{getStateFromPath:p=>p},'expo-linking':{createURL:()=> 'travelingapp://',getInitialURL:async()=> 'travelingapp://auth/reset-password?code=fixture'},'../config/auth':config,'../services/socialAuth':{isSocialAuthInProgress:()=>false}});
  assert.equal(links.linking.getStateFromPath('/auth/reset-password?code=private#access_token=private',{}),'auth/reset-password');await links.linking.getInitialURL();assert.equal(config.getCapturedRecoveryCallback(),'travelingapp://auth/reset-password?code=fixture');
});
test('Support retry retains request identity after lost response without storing message text',async()=>{
  const keys=new Map(),calls=[];let fails=true;
  const crypto=require('node:crypto');
  const svc=load('src/services/guestSupport.ts',{'expo-crypto':{CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_,s)=>crypto.createHash('sha256').update(s).digest('hex'),randomUUID:crypto.randomUUID},'./apiClient':{apiClient:{post:async(url,body)=>{calls.push(body);if(fails){fails=false;throw new Error('network');}return {data:{success:true,data:{id:'ticket'}}};}}},'../utils/storage':{storage:{getItem:async k=>keys.get(k),setItem:async(k,v)=>keys.set(k,v),removeItem:async k=>keys.delete(k)}}});
  await assert.rejects(svc.sendSupport('u','/support-tickets',{body:'private message'}));assert.equal(JSON.stringify([...keys]).includes('private message'),false);
  await svc.sendSupport('u','/support-tickets',{body:'private message'});assert.equal(calls[0].requestId,calls[1].requestId);assert.equal(keys.size,0);
});
